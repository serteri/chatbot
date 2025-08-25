"use client";

import { useState, useRef, useEffect, useMemo, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { marked } from "marked";
import DOMPurify from "dompurify";

type Role = "user" | "assistant";
interface Message { id: string; role: Role; content: string; }

export default function PublicChatClient() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const searchParams = useSearchParams();

    // ✅ chatbotId: URL > ENV fallback, trim’li
    const chatbotId = useMemo(() => {
        const fromUrl = searchParams.get("chatbotId")?.trim();
        const fromEnv = (process.env.NEXT_PUBLIC_PUBLIC_CHATBOT_ID ?? "").trim();
        return fromUrl || fromEnv; // "" dönebilir
    }, [searchParams]);

    // otomatik scroll
    useEffect(() => {
        const el = messagesContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        if (!chatbotId) {
            // URL ve ENV’de id yoksa göndermeyi engelle
            setMessages(prev => [
                ...prev,
                { id: `e_${Date.now()}`, role: "assistant", content: "Demo chatbot bulunamadı. Lütfen URL'ye ?chatbotId=... ekleyin veya NEXT_PUBLIC_PUBLIC_CHATBOT_ID ayarlayın." }
            ]);
            return;
        }

        const userMessage: Message = { id: `u_${Date.now()}`, role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch("/api/public-chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    chatbotId,
                    conversationId, // varsa devamına yazılacak
                }),
                signal: controller.signal,
            });

            if (!res.ok || !res.body) {
                const text = await res.text().catch(() => "");
                throw new Error(text || "stream açılamadı");
            }

            // boş assistant mesajı ekle; gelen parçaları buna dolduracağız
            const assistantId = `a_${Date.now()}`;
            setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");

            // __CID__ işareti chunk sınırında gelebilir; güvenli buffer
            let buffer = "";
            let acc = "";

            const flushUI = (txt: string) => {
                setMessages(prev => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.id === assistantId && last.role === "assistant") {
                        copy[copy.length - 1] = { ...last, content: txt };
                    }
                    return copy;
                });
            };

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // marker başı bu chunk'ın sonuna denk geldiyse ekrana yansıtmayalım
                const markerStart = buffer.lastIndexOf("\n__CID__");
                if (markerStart === -1) {
                    // marker yok, tüm buffer'ı yaz
                    acc += buffer;
                    flushUI(acc);
                    buffer = "";
                    continue;
                }

                // marker var: marker öncesi güvenli kısım ekrana, sonrası buffer'da kalsın
                const safeText = buffer.slice(0, markerStart);
                acc += safeText;
                flushUI(acc);
                buffer = buffer.slice(markerStart); // "__CID__" dahil kısmı tut

                // Tam bir __CID__ yakaladık mı?
                const cidMatch = buffer.match(/__CID__:(\S+)/);
                if (cidMatch) {
                    setConversationId(cidMatch[1]);
                    // marker'ı kullanıcıya göstermeyelim
                    buffer = ""; // kalan yok say
                }
            }
        } catch (err: any) {
            setMessages(prev => [
                ...prev,
                { id: `e_${Date.now()}`, role: "assistant", content: err?.message || "Üzgünüm, bir hata oluştu." },
            ]);
        } finally {
            setIsLoading(false);
            abortRef.current = null;
        }
    }

    function handleStop() {
        abortRef.current?.abort();
        abortRef.current = null;
        setIsLoading(false);
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4.1rem)]">
            <main ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* chatbotId yok uyarısı */}
                {!chatbotId && (
                    <div className="alert alert-warning max-w-2xl">
            <span>
              Demo chatbot ID bulunamadı. URL'ye <code>?chatbotId=...</code> ekleyin veya
              <code className="ml-1">NEXT_PUBLIC_PUBLIC_CHATBOT_ID</code> ayarlayın.
            </span>
                    </div>
                )}

                {messages.map((m) => (
                    <div key={m.id} className={`chat ${m.role === "user" ? "chat-end" : "chat-start"}`}>
                        <div className={`chat-bubble ${m.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary"}`}>
                            {m.role === "assistant"
                                ? <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.content || "") as string) }}
                                />
                                : <p className="whitespace-pre-wrap">{m.content}</p>
                            }
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="chat chat-start">
                        <div className="chat-bubble">
                            <span className="loading loading-dots loading-md"></span>
                        </div>
                    </div>
                )}
            </main>

            <footer className="p-4 border-t bg-base-100">
                <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Bir mesaj yazın..."
                        className="input input-bordered w-full"
                        disabled={isLoading || !chatbotId}
                        autoComplete="off"
                    />
                    <button type="submit" className="btn btn-primary" disabled={isLoading || !chatbotId}>
                        Gönder
                    </button>
                    <button type="button" className="btn" onClick={handleStop} disabled={!isLoading}>
                        Durdur
                    </button>
                </form>
                <div className="mt-2 text-xs opacity-60 text-center">
                    {conversationId ? <>Konuşma ID: {conversationId}</> : chatbotId ? <>Bot: {chatbotId}</> : <>Bot yok</>}
                </div>
            </footer>
        </div>
    );
}

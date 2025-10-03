// src/app/dashboard/chat/[chatbotId]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { useSession, signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { marked } from "marked";
import DOMPurify from "dompurify";

type Role = "user" | "assistant";
interface Message { id: string; role: Role; content: string; }

export default function ChatWithBotPage() {
    const router = useRouter();
    const { status } = useSession({
        required: true,
        onUnauthenticated() { signIn(); }, // redirect yerine
    });

    // /dashboard/chat/[chatbotId] dinamik segment
    const params = useParams();
    const chatbotId = useMemo(() => {
        const v = (params?.chatbotId ?? "") as string | string[];
        return Array.isArray(v) ? v[0] : v;
    }, [params]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const messagesRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const el = messagesRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        if (!chatbotId) {
            setMessages((prev) => [...prev, { id: `e_${Date.now()}`, role: "assistant", content: "Chatbot ID bulunamadı." }]);
            return;
        }

        const userMessage: Message = { id: `u_${Date.now()}`, role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            // ✅ Özel (auth’lı) stream endpoint
            const res = await fetch("/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    chatbotId,
                    conversationId,
                }),
                signal: controller.signal,
            });

            if (!res.ok || !res.body) {
                const text = await res.text().catch(() => "");
                throw new Error(text || "stream açılamadı");
            }

            // boş assistant mesajı ekle; gelen parçaları buna dolduracağız
            const assistantId = `a_${Date.now()}`;
            setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let buffer = "";
            let acc = "";

            const flushUI = (txt: string) => {
                setMessages((prev) => {
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

                // __CID__ marker’ını güvenli işle (chunk sınırına bölünebilir)
                const markerStart = buffer.lastIndexOf("\n__CID__");
                if (markerStart === -1) {
                    acc += buffer;
                    flushUI(acc);
                    buffer = "";
                    continue;
                }

                const safeText = buffer.slice(0, markerStart);
                acc += safeText;
                flushUI(acc);
                buffer = buffer.slice(markerStart);

                const cidMatch = buffer.match(/__CID__:(\S+)/);
                if (cidMatch) {
                    setConversationId(cidMatch[1]);
                    buffer = ""; // marker’ı göstermiyoruz
                }
            }
        } catch (err: any) {
            setMessages((prev) => [
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

    if (status === "loading") {
        return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
    }

    return (
        <div className="flex flex-col h-screen text-sm bg-base-100">
            <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => (
                    <div key={m.id} className={`chat ${m.role === "user" ? "chat-end" : "chat-start"}`}>
                        <div className={`chat-bubble ${m.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary"}`}>
                            {m.role === "assistant"
                                ? (
                                    <div
                                        className="prose max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(marked.parse(m.content || "") as string),
                                        }}
                                    />
                                )
                                : <p className="whitespace-pre-wrap">{m.content}</p>}
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
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Mesaj yaz..."
                    className="input input-bordered w-full"
                    disabled={isLoading}
                    autoComplete="off"
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    Gönder
                </button>
                <button type="button" className="btn" onClick={handleStop} disabled={!isLoading}>
                    Durdur
                </button>
            </form>

            <div className="text-center text-xs opacity-60 p-1">
                {conversationId ? `Konuşma ID: ${conversationId}` : chatbotId ? `Bot: ${chatbotId}` : "Bot yok"}
            </div>
        </div>
    );
}

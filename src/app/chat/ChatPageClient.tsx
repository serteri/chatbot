'use client';

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ConversationList from "@/components/ConversationList";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

const PRIVATE_STREAM_ENDPOINT = "/api/chat/stream";

export default function ChatPageClient() {
    const [bootResolved, setBootResolved] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatbotId = searchParams.get("chatbotId");

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef<HTMLDivElement>(null);
    const [showEmoji, setShowEmoji] = useState(false);

    // 1) Eğer URL'de chatbotId yoksa → otomatik seç
    useEffect(() => {
        let alive = true;
        (async () => {
            if (chatbotId) {
                setBootResolved(true);
                return;
            }
            try {
                const res = await fetch('/api/my-chatbots', { cache: "no-store" });
                const data = await res.json();
                if (!alive) return;
                if (Array.isArray(data) && data.length > 0) {
                    router.replace(`/chat?chatbotId=${data[0].id}`);
                } else {
                    setBootResolved(true); // bot yok → ekranda uyarı göstereceğiz
                }
            } catch {
                setBootResolved(true);
            }
        })();
        return () => { alive = false; };
    }, [chatbotId, router]);

    // Conversation seçilince mesajları getir
    const loadMessages = async (conversationId: string) => {
        setMessages([]); // Geçici loading state
        try {
            const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            // data.messages beklenen formatta olsun
            const msgs = Array.isArray(data?.messages) ? data.messages as Message[] : [];
            setMessages(msgs);
        } catch {
            setMessages([]);
        }
    };

    // Scroll to bottom
    useEffect(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatbotId || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // ✅ ÖZEL SOHBET UCU
            const res = await fetch(PRIVATE_STREAM_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    chatbotId,
                    conversationId: selectedConversationId, // varsa devamına yazılacak
                }),
            });

            if (!res.ok || !res.body) {
                const txt = await res.text().catch(() => "");
                throw new Error(txt || "Akış başlatılamadı");
            }

            // boş assistant mesajı ekle; gelen parçaları buna dolduracağız
            const assistantId = `a_${Date.now()}`;
            setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");

            // __CID__ işareti chunk sınırında gelebilir; güvenli buffer
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

                // Eğer marker başı bu chunk'ın sonuna denk geldiyse ekrana yansıtmayalım.
                const markerStart = buffer.lastIndexOf("\n__CID__");
                if (markerStart === -1) {
                    // güvenli: marker yok, tüm buffer'ı yaz
                    acc += buffer;
                    flushUI(acc);
                    buffer = "";
                    continue;
                }

                // marker var: marker öncesi güvenli kısım ekrana, marker sonrası buffer'da kalsın
                const safeText = buffer.slice(0, markerStart);
                acc += safeText;
                flushUI(acc);
                buffer = buffer.slice(markerStart); // "__CID__" dahil kısmı tut

                // Tam bir __CID__ yakaladık mı?
                const cidMatch = buffer.match(/__CID__:(\S+)/);
                if (cidMatch) {
                    setSelectedConversationId(cidMatch[1]); // yeni oluşturulduysa state'e yaz
                    buffer = ""; // marker'ı kullanıcıya göstermeyelim
                }
            }
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString() + "error",
                    role: "assistant",
                    content: err?.message || "Bir hata oluştu.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // ❗Chatbot kimliği yoksa hata göster
    if (!chatbotId && bootResolved) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center space-y-4">
                    <div className="text-lg font-semibold">❗ Henüz bir chatbot oluşturmadınız.</div>
                    <a className="btn btn-primary btn-sm" href="/dashboard/settings">➕ Yeni Chatbot Oluştur</a>
                </div>
            </div>
        );
    }
    // chatbotId yoksa ama otomatik seçim çalışıyor → skeleton
    if (!chatbotId && !bootResolved) {
        return (
            <div className="flex items-center justify-center h-screen">
                <span className="loading loading-spinner loading-lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-base-100">
            {/* Sol Panel: Sohbet geçmişi */}
            <aside className="w-full md:w-64 border-r bg-base-200 p-4 overflow-y-auto">
                <h2 className="text-lg font-bold mb-4">Geçmiş Sohbetler</h2>
                <ConversationList
                    chatbotId={chatbotId!}
                    onSelect={(convId) => {
                        setSelectedConversationId(convId);
                        loadMessages(convId);
                    }}
                />
            </aside>

            {/* Sağ Panel: Chat */}
            <main className="flex-1 flex flex-col">
                <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100">
                    {messages.map((m) => (
                        <div key={m.id} className={`chat ${m.role === "user" ? "chat-end" : "chat-start"}`}>
                            <div className={`chat-bubble ${m.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary"}`}>
                                <p className="whitespace-pre-wrap">{m.content}</p>
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

                {/* Alt Bar */}
                <form onSubmit={handleSubmit} className="relative flex items-center gap-2 p-2 border-t bg-base-100">
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowEmoji((v) => !v)} tabIndex={-1}>
                        😊
                    </button>
                    {showEmoji && (
                        <div className="absolute bottom-14 left-2 z-50">
                            <EmojiPicker onEmojiClick={(emoji) => setInput((prev) => prev + emoji.emoji)} />
                        </div>
                    )}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Mesaj yaz..."
                        className="input input-bordered input-sm flex-1"
                        disabled={isLoading}
                        style={{ minHeight: 32, maxHeight: 42, fontSize: 15 }}
                        aria-label="Mesaj yaz"
                        autoFocus
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading || !input.trim()}>
                        Gönder
                    </button>
                </form>
            </main>
        </div>
    );
}

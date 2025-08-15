'use client';

import { useEffect, useRef, useState } from "react";
import { useSearchParams,useRouter } from "next/navigation";
import ConversationList from "@/components/ConversationList";

import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

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
    const [fileToSend, setFileToSend] = useState<File | null>(null);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) setFileToSend(f);
    };
// 1) Eğer URL'de chatbotId yoksa → otomatik seç
    useEffect(() => {
        let alive = true;
        (async () => {
            if (chatbotId) {
                setBootResolved(true);
                return;
            }
            try {
                const res = await fetch('/api/my-chatbots');
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
            const res = await fetch(`/api/conversations/get?id=${conversationId}`);
            const data = await res.json();
            if (res.ok) setMessages(data.messages);
        } catch (error) {
            setMessages([]);
        }
    };

// Scroll to bottom
    useEffect(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !fileToSend) || !chatbotId || isLoading) return;

        let userMessage: Message;

// Eğer dosya seçiliyse önce dosyayı yükle, sonra mesajı oluştur
        if (fileToSend) {
            const formData = new FormData();
            formData.append("file", fileToSend);
            formData.append("chatbotId", chatbotId);

            // Dosya sunucuya yüklenecek endpoint’i oluşturmalısın (örn: /api/chat-file)
            const uploadRes = await fetch("/api/chat-file", {
                method: "POST",
                body: formData,
            });
            const uploadData = await uploadRes.json();


            userMessage = {
                id: Date.now().toString(),
                role: "user",
                content: `[dosya](${uploadData.url})`, // basitçe link olarak
            };
            setFileToSend(null);
        } else {
            userMessage = {
                id: Date.now().toString(),
                role: "user",
                content: input,
            };
            setInput("");
        }
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const res = await fetch("/api/public-cha", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    chatbotId,
                    conversationId: selectedConversationId,
                }),
            });
            const body=res.body;
            const data = await res.json();

            if (!res.ok || !body) {
                throw new Error("Akış başlatılamadı");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let acc = "";
            let cid: string | null = null;

            // boş assistant mesajı ekle, stream geldikçe append edelim
            const tempId = Date.now().toString() + "ai";
            setMessages(prev => [...prev, { id: tempId, role: "assistant", content: "" }]);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });

                // CID işaretini yakala (son satırlarda gelir)
                const parts = chunk.split("\n");
                for (const p of parts) {
                    if (p.startsWith("__CID__:")) {
                        cid = p.replace("__CID__:", "").trim();
                    } else {
                        acc += p;
                        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: acc } : m));
                    }
                }
            }

            if (!selectedConversationId && cid) {
                setSelectedConversationId(cid);
            }
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString() + "error",
                    role: "assistant",
                    content: err.message || "Bir hata oluştu.",
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
                                {m.content.startsWith("[dosya](") ? (
                                    // Linkten uzantıyı ayıkla, dosya türüne göre göster
                                    m.content.endsWith(".pdf)") ? (
                                        <a href={m.content.slice(7, -1)} target="_blank" rel="noopener" className="underline">PDF Görüntüle</a>
                                    ) : (
                                        <img src={m.content.slice(7, -1)} alt="Gönderilen dosya" className="max-h-40 rounded" />
                                    )
                                ) : (
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                )}
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
                            <EmojiPicker
                                onEmojiClick={(emoji) => setInput(input + emoji.emoji)}

                            />
                        </div>
                    )}
                    <label htmlFor="chat-file" className="btn btn-ghost btn-sm px-2">
                        📎
                    </label>--
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
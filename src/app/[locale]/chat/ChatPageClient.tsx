// src/app/chat/ChatPageClient.tsx (DOĞRU VERİ AKIŞIYLA NİHAİ HALİ)

'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConversationList from "@/components/ConversationList";
import dynamic from "next/dynamic";
import type { Chatbot } from "@prisma/client"; // Prisma'dan Chatbot tipini alıyoruz

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

// YENİ: Bileşen artık 'chatbot' nesnesini prop olarak alıyor
interface Props {
    chatbot: Chatbot;
}

const PRIVATE_STREAM_ENDPOINT = "/api/chat/stream";

export default function ChatPageClient({ chatbot }: Props) {
    const router = useRouter();

    // ARTIK GEREKLİ DEĞİL: searchParams ve ona bağlı useEffect'ler kaldırıldı.
    // Çünkü chatbot bilgisi artık doğrudan prop olarak geliyor.

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef<HTMLDivElement>(null);
    const [showEmoji, setShowEmoji] = useState(false);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const chatbotId = chatbot.id; // ID'yi doğrudan prop'tan alıyoruz
// YENİ: Sohbet modunu yönetmek için state
    const [chatMode, setChatMode] = useState<'HYBRID' | 'STRICT'>(chatbot.mode); // Varsayılanı bot'un ayarından al
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Conversation seçilince mesajları getir
    const loadMessages = async (conversationId: string) => {
        setIsLoading(true);
        setMessages([]);
        try {
            const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`);
            if (!res.ok) throw new Error("Mesajlar yüklenemedi");
            const data = await res.json();
            const msgs = Array.isArray(data?.messages) ? data.messages as Message[] : [];
            setMessages(msgs);
        } catch(e) {
            console.error(e);
            setMessages([]);
        } finally {
            setIsLoading(false);
        }
    };
    const handleNewChat = () => {
        setMessages([]);
        setSelectedConversationId(null);
    };
    // Scroll to bottom
    useEffect(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatbotId || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch(PRIVATE_STREAM_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    chatbotId,
                    conversationId: selectedConversationId,
                    mode: chatMode, // YENİ: Seçilen modu API'ye gönder
                }),
            });

            if (!res.ok || !res.body) {
                const txt = await res.text().catch(() => "");
                throw new Error(txt || "Akış başlatılamadı");
            }

            const assistantId = `a_${Date.now()}`;
            setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullResponse = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                fullResponse += decoder.decode(value, { stream: true });
                setMessages((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.id === assistantId) {
                        last.content = fullResponse.split("__CID__")[0]; // CID'yi gösterme
                    }
                    return copy;
                });
            }

            const cidMatch = fullResponse.match(/__CID__:(\S+)/);
            if (cidMatch && cidMatch[1]){
                // Sohbeti kaydettikten sonra listeyi yenilemek için sayfayı yeniden yönlendirebiliriz
                // veya sadece state'i güncelleyebiliriz. Şimdilik basit tutalım.
                setSelectedConversationId(cidMatch[1]);
            }
        } catch (err: any) {
            setMessages((prev) => [...prev, { id: Date.now().toString() + "error", role: "assistant", content: err?.message || "Bir hata oluştu.", }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
            {/* Sol Panel: Sohbet geçmişi */}
            <aside className="w-full md:w-64 border-r bg-base-200 p-4 overflow-y-auto">
                <button onClick={() => { setSelectedConversationId(null); setMessages([]); }} className="btn btn-primary btn-sm w-full mb-4">+ Yeni Sohbet</button>
                <h2 className="text-lg font-bold mb-4">Geçmiş Sohbetler</h2>
                <ConversationList
                    chatbotId={chatbotId}
                    onSelect={(convId) => {
                        setSelectedConversationId(convId);
                        loadMessages(convId);
                    }}
                />
            </aside>

            {/* Sağ Panel: Chat */}
            <main className="flex-1 flex flex-col">
                <div className="p-4 bg-base-100 text-center border-b">
                    <div className="w-1/3"></div>
                    <h1 className="text-xl font-bold">'{chatbot.name}' ile Sohbet</h1>
                    {/* YENİ: Mod Seçim Dropdown'ı */}
                    <div className="w-1/3 flex justify-end">
                        <div className="form-control">
                            <label className="label cursor-pointer gap-2">
                                <span className="label-text">Mod:</span>
                                <select
                                    className="select select-bordered select-xs"
                                    value={chatMode}
                                    onChange={(e) => setChatMode(e.target.value as 'HYBRID' | 'STRICT')}
                                >
                                    <option value="HYBRID">Hybrid</option>
                                    <option value="STRICT">Strict</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>
                <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100">
                    {messages.map((m) => (
                        <div key={m.id} className={`chat ${m.role === "user" ? "chat-end" : "chat-start"}`}>
                            <div className={`chat-bubble ${m.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary"}`}>
                                <p className="whitespace-pre-wrap">{m.content}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (<div className="chat chat-start"><div className="chat-bubble"><span className="loading loading-dots loading-md"></span></div></div>)}
                </div>
                <form onSubmit={handleSubmit} className="relative flex items-center gap-2 p-2 border-t bg-base-100">
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowEmoji((v) => !v)}>😊</button>
                    {showEmoji && (<div className="absolute bottom-14 left-2 z-50"><EmojiPicker onEmojiClick={(emoji) => setInput((prev) => prev + emoji.emoji)} /></div>)}
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Mesaj yaz..." className="input input-bordered input-sm flex-1" disabled={isLoading} autoFocus />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading || !input.trim()}>Gönder</button>
                </form>
            </main>
        </div>
    );
}
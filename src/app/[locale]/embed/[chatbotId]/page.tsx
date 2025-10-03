'use client';

import { useEffect, useRef, useState } from "react";

// Mesajlar için tip tanımı
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

// Next.js'in dinamik bir sayfa için beklediği props'ların doğru tipi
type EmbedPageProps = {
    params: {
        chatbotId: string;
    };
};

// DİKKAT: Fonksiyon tanımında 'async' anahtar kelimesi KESİNLİKLE OLMAMALI.
export default function EmbedPage({ params }: EmbedPageProps) {
    const { chatbotId } = params;

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Her yeni mesajda en alta kaydır
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Form gönderme fonksiyonu kendi içinde 'async' olabilir, bu normal.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/public-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages, userMessage], chatbotId }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Bir hata oluştu.");

            const assistantMessage: Message = { id: Date.now().toString() + "-ai", role: "assistant", content: result.text };
            setMessages((prev) => [...prev, assistantMessage]);

        } catch (error: any) {
            const errorMessage: Message = { id: Date.now().toString() + "-err", role: "assistant", content: `Hata: ${error.message}` };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!chatbotId) {
        return <div className="flex items-center justify-center h-screen text-red-500 font-semibold">Chatbot ID bulunamadı.</div>;
    }

    // JSX kısmı
    return (
        <div className="flex flex-col h-screen bg-base-100 font-sans">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                        <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
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
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-2 border-t bg-base-200 flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="input input-bordered w-full"
                    disabled={isLoading}
                    autoFocus
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                    Gönder
                </button>
            </form>
        </div>
    );
}
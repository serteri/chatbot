"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useSearchParams } from "next/navigation";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export default function PublicChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();

    const chatbotId = searchParams.get("chatbotId") || "default-public-chatbot-id";

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/public-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    chatbotId,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Sunucu hatası");
            }

            const data = await response.json();
            const assistantMessage: Message = {
                id: Date.now().toString() + "ai",
                role: "assistant",
                content: data.text,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString() + "error",
                    role: "assistant",
                    content: error.message || "Üzgünüm, bir hata oluştu.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4.1rem)]">
            <main ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
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
            </main>
            <footer className="p-4 border-t bg-base-100">
                <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Bir mesaj yazın..."
                        className="input input-bordered w-full"
                        disabled={isLoading}
                        autoComplete="off"
                    />
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        Gönder
                    </button>
                </form>
            </footer>
        </div>
    );
}

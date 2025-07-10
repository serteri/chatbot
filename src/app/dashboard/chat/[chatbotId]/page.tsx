'use client';

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export default function ChatWithBotPage() {
    const { chatbotId } = useParams() as { chatbotId: string };
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/signin");
        },
    });

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
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
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    chatbotId,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Sunucu hatası");

            const botMessage: Message = {
                id: Date.now().toString() + "ai",
                role: "assistant",
                content: data.text,
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString() + "err",
                    role: "assistant",
                    content: err.message || "Bir hata oluştu.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "loading") {
        return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
    }

    return (
        <div className="flex flex-col h-screen text-sm bg-base-100">
            <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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

            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Mesaj yaz..."
                    className="input input-bordered w-full"
                    disabled={isLoading}
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    Gönder
                </button>
            </form>
        </div>
    );
}
'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface PageParams {
    params: {
        chatbotId: string;
    };
}

export default function EmbedChatPage({ params }: PageParams) {
    const { chatbotId } = params;

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

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
            role: 'user',
            content: input
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch('/api/public-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    chatbotId,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Sunucu hatası');

            const botMessage: Message = {
                id: Date.now().toString() + '-ai',
                role: 'assistant',
                content: data.text
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (err: any) {
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString() + '-error',
                    role: 'assistant',
                    content: err.message || 'Bir hata oluştu.'
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };
    if (!chatbotId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-red-600 font-semibold">❗Chatbot ID eksik.</div>
            </div>
        );
    }
    return (
        <div className="flex flex-col h-screen bg-white text-sm">
            <div className="px-4 py-2 border-b text-sm opacity-70">
                Embedded Chat · Bot: {chatbotId}
            </div>
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((m) => (
                    <div key={m.id} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                        <div className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                            <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="chat chat-start">
                        <div className="chat-bubble"><span className="loading loading-dots loading-md"></span></div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t p-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Mesaj yazın..."
                    className="input input-bordered w-full input-sm"
                    disabled={isLoading}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading || !input.trim()}>
                    Gönder
                </button>
            </form>
        </div>
    );
}

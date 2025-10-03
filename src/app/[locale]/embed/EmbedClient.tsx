// src/app/embed/EmbedClient.tsx (ÖZELLEŞTİRİLEBİLİR HALİ)
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "next/navigation";

type Message = {
    role: "user" | "assistant";
    content: string;
};

export default function EmbedClient() {
    const searchParams = useSearchParams();

    // URL'den hem ID'yi hem de yeni özelleştirme parametrelerini oku
    const chatbotId = searchParams.get("id");
    const primaryColor = searchParams.get("primaryColor") || "#570DF8"; // Varsayılan renk (DaisyUI primary)
    const headerText = searchParams.get("headerText") || "Yapay Zeka Asistanı";
    const initialMessage = searchParams.get("initialMessage"); // Varsayılanı olmayabilir

    // Başlangıç mesajını state'e ekle
    const [messages, setMessages] = useState<Message[]>(
        initialMessage ? [{ role: "assistant", content: initialMessage }] : []
    );

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // ... (sendMessage ve diğer fonksiyonlar aynı kalıyor) ...
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatbotId) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        const response = await fetch('/api/public-chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, chatbotId: chatbotId, messages: [...messages, userMessage] }),
        });

        if (!response.body) {
            setIsLoading(false);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantResponse = "";

        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantResponse += decoder.decode(value, { stream: true });
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantResponse;
                return newMessages;
            });
        }
        setIsLoading(false);
    };


    if (!chatbotId) {
        return <div className="flex h-screen items-center justify-center p-4 text-center">Geçersiz veya eksik Chatbot ID. Lütfen embed kodunu kontrol edin.</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-base-200 font-sans">
            {/* YENİ: Özelleştirilebilir Başlık */}
            <header className="p-4 text-center text-white shadow-md" style={{ backgroundColor: primaryColor }}>
                <h1 className="font-bold">{headerText}</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, index) => (
                    <div key={index} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                        {/* YENİ: Kullanıcı balonu artık dinamik renkli */}
                        <div
                            className={`chat-bubble text-white`}
                            style={{ backgroundColor: m.role === 'user' ? primaryColor : undefined }}
                        >
                            {m.content}
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
            <form onSubmit={handleSubmit} className="p-4 bg-base-100 border-t">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        className="input input-bordered w-full"
                        disabled={isLoading}
                    />
                    {/* YENİ: Gönder butonu artık dinamik renkli */}
                    <button type="submit" className="btn text-white" style={{ backgroundColor: primaryColor }} disabled={isLoading || !input.trim()}>
                        {isLoading ? <span className="loading loading-spinner"/> : 'Gönder'}
                    </button>
                </div>
            </form>
        </div>
    );
}
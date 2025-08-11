'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Chatbot {
    id: string;
    name: string;
}

type Props = {
    onSelect?: (id: string) => void;
    refreshKey?: any;
};

export default function ChatbotList({ onSelect, refreshKey }: Props) {
    const [chatbots, setChatbots] = useState<Chatbot[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchChatbots = async () => {
            try {
                const res = await fetch('/api/my-chatbots');
                const data = await res.json();
                if (res.ok) {
                    setChatbots(data);
                } else {
                    console.error("Chatbot listesi alınamadı:", data);
                }
            } catch (error) {
                console.error("Chatbot listesi alınamadı:", error);
            }
        };
        fetchChatbots();
    }, [refreshKey]);

    return (
        <div className="space-y-2">
            <h2 className="text-xl font-semibold mb-2">Chatbotlarım</h2>
            {chatbots.map((bot) => (
                <div
                    key={bot.id}
                    className="p-3 border rounded-lg hover:bg-base-200 cursor-pointer"
                    onClick={() => {
                        if (onSelect) {
                            onSelect(bot.id);
                        } else {
                            router.push(`/chat?chatbotId=${bot.id}`);
                        }
                    }}
                >
                    {bot.name}
                </div>
            ))}
        </div>
    );
}
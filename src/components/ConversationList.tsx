'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

interface Conversation {
    id: string;
    title: string;
    createdAt: string;
}
interface Props {
    chatbotId: string;
    onSelect: (id: string) => void;
    selectedId?: string;
}

export default function ConversationList({ chatbotId, onSelect, selectedId }: Props) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Eğer bir chatbotId yoksa, istek gönderme.
        if (!chatbotId) {
            setIsLoading(false);
            return;
        }

        const fetchConversations = async () => {
            setIsLoading(true);
            try {
                // Bu chatbot'a ait konuşmaları çeken API'yi çağır
                const res = await fetch(`/api/chatbots/${chatbotId}/conversations`);
                if (!res.ok) {
                    throw new Error("Konuşmalar yüklenemedi.");
                }
                const data = await res.json();
                setConversations(data);
            } catch (error) {
                console.error(error);
                setConversations([]); // Hata durumunda listeyi boşalt
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversations();
    }, [chatbotId]); // chatbotId her değiştiğinde bu fonksiyon yeniden çalışır


    if (isLoading) {
        return <div className="space-y-2"><div className="skeleton h-8 w-full"></div><div className="skeleton h-8 w-full"></div></div>;
    }
    if (!conversations.length===0) return <div>Henüz sohbet yok.</div>;

    return (
        <ul className="space-y-1">
            {conversations.map(conv => (
                <div
                    key={conv.id}
                    onClick={() => onSelect(conv.id)}
                    className={`cursor-pointer px-3 py-2 rounded-md mb-2 transition-colors ${
                        selectedId === conv.id
                            ? "bg-primary/20 font-semibold"
                            : "hover:bg-base-300"
                    }`}
                >
                    {conv.title || "Sohbet"}
                </div>
            ))}
            {conversations.length === 0 && (
                <li className="text-center text-gray-400 text-sm py-4">Sohbet yok</li>
            )}
        </ul>
    );
}
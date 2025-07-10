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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!chatbotId) return;
        setLoading(true);
        fetch(`/api/conversations?chatbotId=${chatbotId}`)
            .then(res => res.json())
            .then(data => setConversations(data));
    }, [chatbotId]);


    if (!conversations.length) return <div>Henüz sohbet yok.</div>;

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
'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

// Tipleri tanımlayalım
interface Message {
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}
interface Conversation {
    _id: string;
    title: string;
    messages: Message[];
}

// URL'den gelen parametrelerin tipini belirtiyoruz
interface PageParams {
    params: {
        conversationId: string;
    }
}

export default function ConversationDetailPage({ params }: PageParams) {
    const { status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/signin'); },
    });

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConversation = async () => {
            if (params.conversationId) {
                try {
                    const res = await fetch(`/api/conversations/${params.conversationId}`);
                    if (!res.ok) {
                        throw new Error('Konuşma yüklenemedi.');
                    }
                    const data = await res.json();
                    setConversation(data);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchConversation();
    }, [params.conversationId]); // conversationId değiştiğinde tekrar veri çek

    if (status === 'loading' || isLoading) {
        return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <Link href="/dashboard" className="link link-primary">← Tüm Konuşmalara Geri Dön</Link>
                <h1 className="text-3xl font-bold mt-2">{conversation?.title}</h1>
            </div>

            {error && <p className="text-red-500">Hata: {error}</p>}
            {conversation && <h1 className="text-3xl font-bold mt-2">{conversation.title}</h1>}

            {conversation && (
                <div className="space-y-6">
                    {Array.isArray(conversation.messages) && conversation.messages.map((msg, index) => (
                        <div key={index} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                            <div className="chat-image avatar">
                                <div className={`w-10 rounded-full ${msg.role === 'user' ? 'bg-primary text-primary-content' : 'bg-secondary text-secondary-content'}`}>
                                    <span className="text-xl">{msg.role === 'user' ? 'Siz' : 'AI'}</span>
                                </div>
                            </div>
                            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className="chat-footer opacity-50">
                                <time className="text-xs">{new Date(msg.createdAt).toLocaleTimeString('tr-TR')}</time>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
'use client';

import SettingsForm from "@/components/SettingsForm";
import DocumentUploader from "@/components/DocumentUploader";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import ChatbotList from "@/components/ChatbotList";


interface DBConversation {
    id: string;
    title: string;
    createdAt: string;
}
interface Chatbot {
    id: string;
    name: string;
}
export default function DashboardPage() {
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/signin');
        },
    });
    const [chatbots, setChatbots] = useState<Chatbot[]>([]);
    const [conversations, setConversations] = useState<DBConversation[]>([]);
    const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/my-chatbots')
                .then(res => res.json())
                .then(setChatbots)
                .catch(() => setChatbots([]));
        }
    }, [status]);
// Konuşmaları getir
    useEffect(() => {
        if (status === 'authenticated') {
            const fetchConversations = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch('/api/conversations');
                    if (!res.ok) throw new Error('Konuşmalar yüklenemedi.');
                    const data = await res.json();
                    setConversations(data);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchConversations();
        }
    }, [status]);

    if (status === 'loading') {
        return (
            <div className="flex justify-center items-center h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
            {/* ➕ Chatbot Oluştur Butonu */}
            <div className="flex justify-end">
                <Link href="/dashboard/settings" className="btn btn-sm btn-outline">
                    ➕ Yeni Chatbot Oluştur
                </Link>
            </div>

            {/* Dosya yükleme bölümü */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DocumentUploader chatbotId={selectedChatbotId} />
                {/* <SettingsForm /> component'ini daha sonra ekleyebiliriz */}
            </div>
            {/* Kullanıcının chatbot'ları */}
            <div>
                <h2 className="text-3xl font-bold mb-6">Chatbotlarım</h2>
                <ChatbotList />
            </div>
            {/* Konuşma Geçmişi */}
            <div>
                <h2 className="text-3xl font-bold mb-6">Sohbet Geçmişiniz</h2>

                {isLoading ? (
                    <div className="skeleton h-20 w-full"></div>
                ) : error ? (
                    <div className="alert alert-error">{error}</div>
                ) : conversations.length === 0 ? (
                    <div className="text-center p-8 bg-base-200 rounded-lg">
                        <p>Henüz bir sohbet geçmişiniz bulunmuyor.</p>
                        <div className="mt-4 space-x-2">
                            <Link href="/chat" className="btn btn-primary btn-sm">İlk Sohbetinizi Başlatın</Link>
                            <Link href="/dashboard/settings" className="btn btn-outline btn-sm">➕ Yeni Chatbot Oluştur</Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {conversations.map((convo) => (
                            <Link href={`/dashboard/${convo.id}`} key={convo.id} className="block">
                                <div className="card bg-base-100 shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
                                    <div className="card-body p-4">
                                        <h2 className="card-title text-lg">{convo.title}</h2>
                                        <p className="text-sm text-gray-500">
                                            Oluşturulma: {new Date(convo.createdAt).toLocaleDateString('tr-TR')}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
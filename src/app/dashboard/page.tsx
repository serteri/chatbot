'use client';

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import ChatbotList from "@/components/ChatbotList";
import DocumentUploader from "@/components/DocumentUploader";
import ChatbotDocuments from "@/components/ChatbotDocuments";
import EmbedCodeDisplay from "@/components/EmbedCodeDisplay";

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
    // 1) Auth guard
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            // redirect('/signin') client'ta yasak; signIn veya router.push kullan
            signIn(); // varsayılan giriş sayfasına götürür
        },
    });

    // 2) State’ler
    const [chatbots, setChatbots] = useState<Chatbot[]>([]);
    const [conversations, setConversations] = useState<DBConversation[]>([]);
    const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // 3) Chatbotları çek
    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/my-chatbots')
                .then(res => res.ok ? res.json() : Promise.reject("Botlar yüklenemedi"))
                .then(data => {
                    setChatbots(data);
                    // opsiyonel: ilk botu otomatik seç
                    if (!selectedChatbotId && Array.isArray(data) && data.length) {
                        setSelectedChatbotId(data[0].id);
                    }
                })
                .catch(() => setChatbots([]));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, refreshKey]);

    // 4) Konuşmaları çek
    useEffect(() => {
        if (status === 'authenticated') {
            setIsLoading(true);
            fetch('/api/conversations') // bu endpoint yoksa aşağıdaki GET dosyasını ekle
                .then(res => res.ok ? res.json() : Promise.reject("Konuşmalar yüklenemedi"))
                .then(data => {
                    setConversations(data);
                    setError(null);
                })
                .catch(err => setError(err as string))
                .finally(() => setIsLoading(false));
        }
    }, [status]);

    // 5) Loading durumu
    if (status === 'loading') {
        return (
            <div className="flex justify-center items-center h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
            {/* ➕ Yeni Chatbot Oluştur Butonu */}
            <div className="flex justify-end">
                <Link href="/dashboard/settings" className="btn btn-sm btn-outline">
                    ➕ Yeni Chatbot Oluştur
                </Link>
            </div>

            {/* Chatbot Listesi */}
            <section>
                <h2 className="text-3xl font-bold mb-4">Chatbotlarım</h2>
                <ChatbotList
                    onSelect={(id) => setSelectedChatbotId(id)}
                    refreshKey={refreshKey}
                />
            </section>

            {/* Seçilen Chatbot için Doküman & Embed */}
            {selectedChatbotId && (
                <section className="space-y-6">
                    <DocumentUploader chatbotId={selectedChatbotId} />
                    <ChatbotDocuments chatbotId={selectedChatbotId} />
                    <EmbedCodeDisplay chatbotId={selectedChatbotId} />
                </section>
            )}

            {/* Sohbet Geçmişi */}
            <section>
                <h2 className="text-3xl font-bold mb-4">Sohbet Geçmişiniz</h2>

                {isLoading ? (
                    <div className="skeleton h-20 w-full"></div>
                ) : error ? (
                    <div className="alert alert-error">{error}</div>
                ) : conversations.length === 0 ? (
                    <div className="text-center p-8 bg-base-200 rounded-lg">
                        <p>Henüz bir sohbet geçmişiniz bulunmuyor.</p>
                        <div className="mt-4 space-x-2">
                            <Link href="/chat" className="btn btn-primary btn-sm">
                                İlk Sohbetinizi Başlatın
                            </Link>
                            <Link href="/dashboard/settings" className="btn btn-outline btn-sm">
                                ➕ Yeni Chatbot Oluştur
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {conversations.map((convo) => (
                            <Link
                                href={`/conversations/${convo.id}`} // /dashboard/${id} değil!
                                key={convo.id}
                                className="block"
                            >
                                <div className="card bg-base-100 shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
                                    <div className="card-body p-4">
                                        <h2 className="card-title text-lg">{convo.title}</h2>
                                        <p className="text-sm text-gray-500">
                                            Oluşturulma:{' '}
                                            {new Date(convo.createdAt).toLocaleDateString('tr-TR')}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

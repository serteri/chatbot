'use client';

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from 'next-intl/link'
import ChatbotList from "@/components/ChatbotList";
import ChatbotDocumentsManager from "@/components/ChatbotDocumentsManager";
import EmbedCodeDisplay from "@/components/EmbedCodeDisplay";

// EKLENDİ: Tarih farkını gün olarak hesaplayan yardımcı fonksiyon
const getDaysRemaining = (endDate: any): number | null => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return 0; // Süre dolmuş
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Sizin mevcut interface'leriniz (değişiklik yok)
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
    // EKLENDİ: `useSession`'dan tam `session` verisini de alıyoruz
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        },
    });
    console.log("DASHBOARD SESSION:", session);
    // EKLENDİ: Kalan deneme süresini yönetmek için state ve değişkenler
    const userPlan = (session?.user as any)?.plan;
    const trialEndsAt = (session?.user as any)?.trialEndsAt;
    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    // Sizin mevcut state'leriniz (değişiklik yok)
    const [chatbots, setChatbots] = useState<Chatbot[]>([]);
    const [conversations, setConversations] = useState<DBConversation[]>([]);
    const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // EKLENDİ: Kalan deneme gününü hesaplayan useEffect
    useEffect(() => {
        if (trialEndsAt) {
            setDaysLeft(getDaysRemaining(trialEndsAt));
        }
    }, [trialEndsAt]);

    // Sizin mevcut `useEffect`'leriniz (değişiklik yok)
    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/my-chatbots')
                .then(res => res.ok ? res.json() : Promise.reject("Botlar yüklenemedi"))
                .then(data => {
                    setChatbots(data);
                    if (!selectedChatbotId && Array.isArray(data) && data.length) {
                        setSelectedChatbotId(data[0].id);
                    }
                })
                .catch(() => setChatbots([]));
        }
    }, [status, refreshKey]);

    useEffect(() => {
        if (status === 'authenticated') {
            setIsLoading(true);
            fetch('/api/conversations')
                .then(res => res.ok ? res.json() : Promise.reject("Konuşmalar yüklenemedi"))
                .then(data => {
                    setConversations(data);
                    setError(null);
                })
                .catch(err => setError(err as string))
                .finally(() => setIsLoading(false));
        }
    }, [status]);

    // Sizin mevcut loading durumunuz (değişiklik yok)
    if (status === 'loading') {
        return (
            <div className="flex justify-center items-center h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }
// Yönlendirme için kullanıcının ilk chatbot'unun ID'sini al
    const firstChatbotId = chatbots[0]?.id;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            {/* EKLENDİ: Deneme süresi uyarı bandı */}
            {userPlan === 'PRO' && typeof daysLeft === 'number' && daysLeft > 0 && (
                <div role="alert" className="alert alert-warning shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                        <h3 className="font-bold">Deneme Süreniz Devam Ediyor!</h3>
                        <div className="text-xs">Profesyonel planın tüm özelliklerini kullanmak için <strong>{daysLeft} gününüz</strong> daha var.</div>
                    </div>
                    <Link href="/pricing" className="btn btn-sm">Planları Görüntüle</Link>
                </div>
            )}

            {/* Sizin mevcut JSX'iniz (değişiklik yok) */}
            <div className="flex justify-end">
                <Link href="/dashboard/settings" className="btn btn-sm btn-outline">
                    ➕ Yeni Chatbot Oluştur
                </Link>
            </div>

            <section>
                <h2 className="text-3xl font-bold mb-4">Chatbotlarım</h2>
                <ChatbotList/>
            </section>

            {selectedChatbotId && (
                <section className="space-y-6">
                    <ChatbotDocumentsManager chatbotId={selectedChatbotId} />
                    <EmbedCodeDisplay chatbotId={selectedChatbotId} />
                </section>
            )}

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
                            <Link
                                href={firstChatbotId ? `/chat/${firstChatbotId}` : '/dashboard/settings'}
                                className="btn btn-primary btn-sm"
                            >
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
                            <Link href={`/conversations/${convo.id}`} key={convo.id} className="block">
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
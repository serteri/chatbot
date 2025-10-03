// /dashboard/settings/page.tsx (TAM VE DÜZELTİLMİŞ HALİ)

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatbotDocumentsManager from "@/components/ChatbotDocumentsManager";

export default function SettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State'leri başlangıçta null/false olarak ayarlıyoruz
    const [chatbotId, setChatbotId] = useState<string | null>(null);
    const [chatbotName, setChatbotName] = useState("");
    const [isCreating, setIsCreating] = useState(false); // Başlangıçta false
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // --- YENİ EKLENEN KISIM: URL'deki değişiklikleri dinle ---
    // Bu useEffect, sayfa ilk yüklendiğinde VE URL değiştiğinde çalışır.
    useEffect(() => {
        const idFromUrl = searchParams.get("id");
        if (idFromUrl) {
            // URL'de bir ID varsa, "Düzenleme Modu"na geç
            setChatbotId(idFromUrl);
            setIsCreating(false);
        } else {
            // URL'de ID yoksa, "Oluşturma Modu"na geç
            setIsCreating(true);
            setChatbotId(null);
        }
    }, [searchParams]); // searchParams değiştiğinde bu efekti yeniden çalıştır

    const handleCreateChatbot = async (e: React.FormEvent) => {
        console.log("--- 'Oluştur' butonuna tıklandı, handleCreateChatbot fonksiyonu çalıştı. ---");
        e.preventDefault();
        if (!chatbotName.trim()) {
            setError("Lütfen bir chatbot adı girin.");
            return;
        }
        setIsLoading(true);
        setError("");

        try {
            console.log("Fetch isteği gönderiliyor..."); // YENİ LOG
            const response = await fetch('/api/chatbots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: chatbotName }),
            });
            console.log("Fetch yanıtı alındı. Durum:", response.status); // YENİ LOG

            if (!response.ok) {
                // Sunucudan gelen hatayı ayrıştırıp göstermeye çalış
                const errorData = await response.json().catch(() => null);
                console.error("API Hata Yanıtı:", errorData); // YENİ LOG
                throw new Error(errorData?.error || "Chatbot oluşturulamadı.");
            }

            const newChatbot = await response.json();

            // Oluşturma başarılı, router.push ile URL'yi güncelle.
            // Yukarıdaki useEffect bu değişikliği yakalayıp sayfayı güncelleyecek.
            console.log("Yeni chatbot başarıyla oluşturuldu, yönlendirme yapılıyor:", newChatbot); // YENİ LOG
            router.push(`/dashboard/settings?id=${newChatbot.id}`);

        } catch (err: any) {
            console.error("!!! FETCH TRY-CATCH HATASI YAKALANDI !!!", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Sayfa modu belirlenene kadar hiçbir şey gösterme (titremeyi önler)
    if (chatbotId === null && !isCreating) {
        return <div className="flex justify-center items-center h-screen">
            <span className="loading loading-spinner loading-lg"></span>
        </div>;
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {isCreating ? (
                <div className="card bg-base-100 shadow-lg">
                    {/* ... OLUŞTURMA FORMU (DEĞİŞİKLİK YOK) ... */}
                    <div className="card-body">
                        <h1 className="text-2xl font-semibold">Yeni Chatbot Oluştur</h1>
                        <form onSubmit={handleCreateChatbot} className="space-y-4">
                            <div>
                                <label htmlFor="chatbotName" className="label">
                                    <span className="label-text">Chatbot Adı</span>
                                </label>
                                <input
                                    id="chatbotName"
                                    type="text"
                                    value={chatbotName}
                                    onChange={(e) => setChatbotName(e.target.value)}
                                    placeholder="Örn: Müşteri Destek Botu"
                                    className="input input-bordered w-full"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="card-actions justify-end">
                                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                    {isLoading ? <span className="loading loading-spinner"/> : "Oluştur ve Devam Et"}
                                </button>
                            </div>
                            {error && <div className="alert alert-error mt-4">{error}</div>}
                        </form>
                    </div>
                </div>
            ) : (
                <>
                    {/* ... DÜZENLEME GÖRÜNÜMÜ (DEĞİŞİKLİK YOK) ... */}
                    <h1 className="text-2xl font-semibold">Chatbot Ayarları</h1>
                    <p className="text-sm text-base-content/70">
                        Chatbot ID: <span className="font-mono bg-base-200 p-1 rounded">{chatbotId}</span>
                    </p>
                    {chatbotId && <ChatbotDocumentsManager chatbotId={chatbotId} />}
                </>
            )}
        </div>
    );
}
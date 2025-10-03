// src/components/ChatbotList.tsx (BÜTÜN VE TAM HALİ)

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ConfirmationModal from "./ConfirmationModal"; // Özel modal bileşenini import ediyoruz

// Chatbot nesnesinin tip tanımı
interface Chatbot {
    id: string;
    name: string;
}

export default function ChatbotList() {
    // Arayüzün durumunu yönetmek için gerekli tüm state'ler
    const [chatbots, setChatbots] = useState<Chatbot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal'ın durumunu yöneten state'ler
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Chatbot | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        fetch('/api/my-chatbots', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => setChatbots(data))
            .catch(err => setError("Chatbot listesi yüklenemedi."))
            .finally(() => setIsLoading(false));
    }, []);

    // "Sil" butonuna basıldığında modal'ı açan fonksiyon
    const handleOpenDeleteModal = (chatbot: Chatbot) => {
        setItemToDelete(chatbot); // Hangi chatbot'u sileceğimizi state'e kaydet
        setIsModalOpen(true);     // Modal'ı görünür yap
    };

    // Modal'daki "Onayla" butonuna basıldığında çalışan asıl silme fonksiyonu
    const confirmDeletion = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch(`/api/chatbots/${itemToDelete.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Silme işlemi başarısız oldu.");
            }

            // Silme başarılı olursa, listeyi sayfayı yenilemeden anında güncelle
            setChatbots(currentChatbots =>
                currentChatbots.filter(bot => bot.id !== itemToDelete.id)
            );

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsDeleting(false);
            setIsModalOpen(false);
            setItemToDelete(null);
        }
    };

    // Modal'daki "İptal" butonuna basıldığında çalışan fonksiyon
    const cancelDeletion = () => {
        setIsModalOpen(false);
        setItemToDelete(null);
    };

    if (isLoading) {
        return <div className="skeleton h-24 w-full" />;
    }

    if (error) {
        return <div className="alert alert-error">{error}</div>;
    }

    if (chatbots.length === 0) {
        return <p className="text-center p-4 bg-base-200 rounded-md">Henüz bir chatbot oluşturmadınız.</p>;
    }

    return (
        // Sayfa ve modal'ı birlikte render edebilmek için React Fragment kullanıyoruz
        <>
            <div className="space-y-4">
                {chatbots.map(bot => (
                    <div key={bot.id} className="card bg-base-100 shadow-md">
                        <div className="card-body flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                            <h3 className="card-title text-lg">{bot.name}</h3>
                            <div className="card-actions justify-end flex-wrap gap-2">
                                {/* YENİ: HER BOTA ÖZEL SOHBETE BAŞLA BUTONU */}
                                <Link href={`/chat/${bot.id}`} className="btn btn-sm btn-primary">
                                    Sohbete Başla
                                </Link>
                                <Link href={`/dashboard/documents?id=${bot.id}`} className="btn btn-sm btn-outline">
                                    Belgeler
                                </Link>
                                <Link href={`/dashboard/settings?id=${bot.id}`} className="btn btn-sm btn-ghost">
                                    Ayarlar
                                </Link>
                                <button onClick={() => handleOpenDeleteModal(bot)} className="btn btn-sm btn-error btn-outline">
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmationModal
                isOpen={isModalOpen}
                title="Chatbot'u Silmeyi Onayla"
                message={`'${itemToDelete?.name}' adlı chatbot'u ve tüm belgelerini kalıcı olarak silmek istediğinizden emin misiniz?`}
                onConfirm={confirmDeletion}
                onCancel={cancelDeletion}
                confirmText="Evet, Sil"
                isConfirming={isDeleting}
            />
        </>
    );
}
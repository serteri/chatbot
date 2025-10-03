// src/components/ChatbotFiles.tsx (TÜM DEĞİŞİKLİKLERLE NİHAİ HALİ)

"use client";

import React, { useState } from 'react';
import ConfirmationModal from './ConfirmationModal'; // Özel modal bileşenimizi import ediyoruz

// Tip tanımları
type FileGroup = {
    fileName: string;
    docCount: number;
    lastUpdatedAt: string | null;
};

type Props = {
    chatbotId: string;
    filesData: any;
    isLoading: boolean;
    error: any;
    onDeleteSuccess?: () => void;
    onRefreshRequest?: () => void;
};

export default function ChatbotFiles({ chatbotId, filesData, isLoading, error, onDeleteSuccess, onRefreshRequest }: Props) {
    // Modal'ın durumunu ve hangi dosyanın silineceğini yönetmek için state'ler
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileGroup | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Bu fonksiyon sadece modal'ı açmak için kullanılır
    const handleOpenDeleteModal = (file: FileGroup) => {
        setFileToDelete(file); // Hangi dosyayı sileceğimizi state'e kaydediyoruz
        setIsModalOpen(true);  // Modal'ı görünür yapıyoruz
    };

    // Modal'daki "Onayla" butonuna basıldığında bu fonksiyon çalışır
    const confirmDeletion = async () => {
        if (!fileToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(
                `/api/chatbots/${chatbotId}/files?fileName=${encodeURIComponent(fileToDelete.fileName)}`,
                { method: 'DELETE' }
            );

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Dosya silinemedi.");
            }

            onDeleteSuccess?.(); // Silme başarılı, listeyi yenilemesi için üst bileşeni tetikle
        } catch (err: any) {
            // Hata durumunda tarayıcının standart alert'ini kullanabiliriz
            alert(`Hata: ${err.message}`);
        } finally {
            setIsDeleting(false);
            // İşlem bitince modal'ı her durumda kapat
            setIsModalOpen(false);
            setFileToDelete(null);
        }
    };

    // Modal'dan "İptal" butonuna basıldığında veya kapatıldığında
    const cancelDeletion = () => {
        setIsModalOpen(false);
        setFileToDelete(null);
    };

    return (
        // Bileşeni bir React Fragment (<>...</>) içine alıyoruz ki modal'ı da ekleyebilelim
        <>
            <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                    <div className="flex items-center justify-between">
                        <h3 className="card-title">Yüklenmiş Dosyalar</h3>
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => onRefreshRequest?.()}
                            disabled={isLoading}
                        >
                            Yenile
                        </button>
                    </div>

                    {error && <div className="alert alert-error">Dosyalar yüklenemedi.</div>}
                    {isLoading && <div className="skeleton h-24 w-full" />}
                    {!isLoading && !error && (!filesData?.items || filesData.items.length === 0) && (
                        <p className="text-sm opacity-70">Bu chatbot için henüz bir dosya yüklenmemiş.</p>
                    )}
                    {!isLoading && !error && filesData?.items && filesData.items.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                <tr>
                                    <th>Dosya Adı</th>
                                    <th>Parça Sayısı</th>
                                    <th>Son Yükleme</th>
                                    <th>İşlemler</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filesData.items.map((group: FileGroup) => (
                                    <tr key={group.fileName}>
                                        <td className="font-medium">{group.fileName}</td>
                                        <td>{group.docCount}</td>
                                        <td>{group.lastUpdatedAt ? new Date(group.lastUpdatedAt).toLocaleString('tr-TR') : '-'}</td>
                                        <td className="text-right">
                                            {/* DÜZELTME: Butonun onClick'i artık doğru fonksiyonu çağırıyor */}
                                            <button
                                                className="btn btn-sm btn-error btn-outline"
                                                onClick={() => handleOpenDeleteModal(group)}
                                            >
                                                Sil
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* EKLENDİ: Modal bileşenini sayfamıza ekliyoruz ve state'lere bağlıyoruz */}
            <ConfirmationModal
                isOpen={isModalOpen}
                title="Dosyayı Silmeyi Onayla"
                message={`'${fileToDelete?.fileName}' adlı dosyanın tüm parçalarını kalıcı olarak silmek istediğinizden emin misiniz?`}
                onConfirm={confirmDeletion}
                onCancel={cancelDeletion}
                confirmText="Evet, Sil"
                isConfirming={isDeleting}
            />
        </>
    );
}
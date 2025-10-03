"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation"; // YENİ: URL'den parametre okumak için
import DocumentUploader from "@/components/DocumentUploader";
import ChatbotFiles from "@/components/ChatbotFiles";

export default function DocumentsClient() {
    // YENİ: URL'deki '?id=...' parametresini okumak için useSearchParams hook'unu kullanıyoruz.
    const searchParams = useSearchParams();
    const chatbotId = searchParams.get("id"); // Chatbot ID'si artık doğrudan URL'den okunuyor.

    // SİLİNDİ: Artık ID'yi manuel olarak yönetmek için useState kullanmıyoruz.
    // const [chatbotId, setChatbotId] = useState("");

    // Bu state'ler sizin kodunuzdaki gibi kalıyor, çünkü arayüz yönetimi için harikalar.
    const [filesData, setFilesData] = useState<any>({ items: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>("");

    /* SİLİNDİ: Artık ID'yi çevre değişkenlerinden okumaya gerek yok.
    useEffect(() => {
        const def = (process.env.NEXT_PUBLIC_PUBLIC_CHATBOT_ID ?? "").trim();
        if (def) setChatbotId(def);
    }, []);
    */

    const load = useCallback(async () => {
        // Eğer URL'de bir ID yoksa, hiçbir şey yükleme.
        if (!chatbotId) {
            setFilesData({ items: [] });
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            // API adresi de artık daha tutarlı.
            const res = await fetch(
                `/api/chatbots/${encodeURIComponent(chatbotId)}/files?ts=${Date.now()}`,
                { cache: "no-store" }
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setFilesData(data);
        } catch (e: any) {
            setError(e?.message || "Liste alınamadı.");
            setFilesData({ items: [] });
        } finally {
            setIsLoading(false);
        }
    }, [chatbotId]); // Fonksiyon artık URL'den gelen chatbotId'ye bağımlı.

    // URL'deki chatbotId değiştiğinde verileri otomatik olarak yükle.
    useEffect(() => { load(); }, [load]);

    // Dosya yüklendiğinde listeyi yenilemek için event listener (Bu kısım harika, aynen kalıyor).
    useEffect(() => {
        const handler = () => {
            load();
            setTimeout(load, 400);
            setTimeout(load, 1200);
        };
        window.addEventListener("documents:changed", handler);
        return () => window.removeEventListener("documents:changed", handler);
    }, [load]);

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold">Belgeler</h1>

            {chatbotId ? (
                <>
                    {/* SİLİNDİ: Manuel ID giriş input'u kaldırıldı. Artık gerek yok. */}
                    <p className="text-sm text-base-content/70">
                        Yönetilen Chatbot ID: <span className="font-mono bg-base-200 p-1 rounded">{chatbotId}</span>
                    </p>

                    {/* Upload ve Dosya Listesi bileşenleri sizin kodunuzdaki gibi kalıyor. */}
                    <DocumentUploader
                        chatbotId={chatbotId}
                        onUploadSuccess={load}
                    />

                    <ChatbotFiles
                        chatbotId={chatbotId}
                        filesData={filesData}
                        isLoading={isLoading}
                        error={error}
                        onDeleteSuccess={load}
                        onRefreshRequest={load}
                    />
                </>
            ) : (
                // YENİ: Eğer URL'de bir ID yoksa, kullanıcıyı bilgilendir.
                <div className="card bg-base-200">
                    <div className="card-body items-center text-center">
                        <h2 className="card-title">Lütfen bir chatbot seçin.</h2>
                        <p>Belgelerini görmek için ana panelden bir chatbot seçmeniz gerekmektedir.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
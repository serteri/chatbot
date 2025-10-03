// src/components/DocumentUploader.tsx (DÜZELTİLMİŞ HALİ)

import { useRef, useState } from "react";

type Props = {
    chatbotId: string;
    onUploadSuccess?: () => void;
};

export default function DocumentUploader({ chatbotId, onUploadSuccess }: Props) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);

    const resetInput = () => {
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        resetInput(); // her seferinde sıfırla
        if (!file) return;
        if (!chatbotId) {
            setError("Chatbot ID gerekli.");
            return;
        }

        setIsUploading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("chatbotId", chatbotId);

            const res = await fetch("/api/documents/upload?ts=" + Date.now(), {
                method: "POST",
                body: formData,
            });

            // --- YENİ VE DÜZELTİLMİŞ HATA KONTROLÜ ---
            if (!res.ok) {
                // Response'u SADECE BİR KEZ metin olarak oku.
                const responseText = await res.text();
                let errorMessage = `Yükleme hatası (status: ${res.status})`;

                // Okunan metni JSON olarak ayrıştırmayı dene.
                try {
                    const json = JSON.parse(responseText);
                    errorMessage = json.error || responseText;
                } catch (e) {
                    // Eğer JSON değilse, ham metni hata olarak kullan.
                    errorMessage = responseText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            // --- BİTİŞ ---


            // ✅ Başarılı: event'i fırlat
            window.dispatchEvent(new CustomEvent("documents:changed"));
            onUploadSuccess?.();
        } catch (e: any) {
            setError(e?.message || "Yükleme sırasında hata oluştu.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
                <h3 className="card-title">Bilgi Bankasını Güncelle</h3>
                <p className="text-sm text-base-content/70 mb-4">
                    .txt, .pdf veya .docx dosyaları yükleyin.
                </p>

                <input
                    ref={inputRef}
                    type="file"
                    accept=".txt,.pdf,.docx"
                    disabled={isUploading || !chatbotId}
                    onChange={handleFileChange}
                    className="file-input file-input-bordered w-full"
                />

                {/* sadece HATA göster */}
                <div className="mt-2 text-sm min-h-[20px]">
                    {isUploading ? <span className="loading loading-dots loading-sm" /> : null}
                    {!!error && <div className="alert alert-error mt-2">{error}</div>}
                </div>
            </div>
        </div>
    );
}
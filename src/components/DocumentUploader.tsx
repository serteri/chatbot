'use client';

import React, { useEffect, useState } from "react";
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

interface Chatbot {
    id: string;
    name: string;
}

interface DocumentUploaderProps {
    chatbotId: string;
}

export default function DocumentUploader({ chatbotId }: DocumentUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [chatbots, setChatbots] = useState<Chatbot[]>([]);
    const [selectedChatbotId, setSelectedChatbotId] = useState<string>('');
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    useEffect(() => {
        if (!chatbotId) {
            // Kullanıcının chatbotlarını çek
            const fetchChatbots = async () => {
                try {
                    const res = await fetch('/api/my-chatbots');
                    const data = await res.json();
                    if (res.ok) setChatbots(data);
                    else setMessage('Chatbotlar yüklenemedi.');
                } catch (err) {
                    setMessage('Bir hata oluştu: Chatbotlar çekilemedi.');
                }
            };
            fetchChatbots();
        }
    }, [chatbotId]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            if (f.size > MAX_FILE_SIZE) {
                setMessage('Dosya boyutu en fazla 10 MB olabilir.');
                setFile(null);
                // Eğer temizlemek istersen:
                // e.target.value = ""; // input'u sıfırla
                return;
            }
            setFile(f);
            setMessage('');
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            setMessage('Lütfen önce bir dosya seçin.');
            return;
        }
        if (!selectedChatbotId) {
            setMessage('Lütfen bir chatbot seçin.');
            return;
        }

        setIsLoading(true);
        setMessage('Dosya okunuyor ve işleniyor...');

        try {
            // PDF ve TXT dosyası ayrımı:
            let textContent = '';

            if (file.type === 'text/plain') {
                textContent = await file.text();
            } else if (file.type === 'application/pdf') {
                const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
                pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument(arrayBuffer).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    const items = text.items as TextItem[];
                    fullText += items.map((item) => item.str).join(' ');
                }
                textContent = fullText;
            } else {
                throw new Error("Sadece .txt ve .pdf dosyalar desteklenmektedir.");
            }

            if (!textContent.trim()) {
                throw new Error("Dosya boş ya da okunamıyor.");
            }

            const response = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textContent, fileName: file.name, chatbotId: selectedChatbotId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Sunucu hatası.');
            }

            setMessage(data.message || 'Başarıyla yüklendi!');
            setFile(null);
        } catch (error: any) {
            setMessage(`Hata: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title">Bilgi Bankasını Güncelle</h2>
                <p className="text-sm opacity-60">.txt veya .pdf dosyası yükleyerek AI’ı eğitin.</p>

                {/* Chatbot seçimi */}
                {!chatbotId && (
                    <div className="form-control mt-4">
                        <label className="label">
                            <span className="label-text">Chatbot Seçin</span>
                        </label>
                        <select
                            className="select select-bordered"
                            value={selectedChatbotId}
                            onChange={(e) => setSelectedChatbotId(e.target.value)}
                            required
                        >
                            <option value="">Bir chatbot seçin</option>
                            {chatbots.map(bot => (
                                <option key={bot.id} value={bot.id}>
                                    {bot.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Dosya seçimi */}
                <div className="form-control w-full max-w-xs mt-4">
                    <input
                        type="file"
                        accept=".txt,.pdf"
                        className="file-input file-input-bordered w-full max-w-xs"
                        onChange={handleFileChange}
                        key={file ? 'file-selected' : 'no-file'}
                    />
                    {file && (
                        <label className="label">
                            <span className="label-text-alt">{file.name}</span>
                        </label>
                    )}
                </div>

                {message && (
                    <div className={`alert text-sm p-2 mt-4 ${message.startsWith('Hata') ? 'alert-error' : 'alert-success'}`}>
                        {message}
                    </div>
                )}

                <div className="card-actions justify-end mt-4">
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={!file || isLoading}
                    >
                        {isLoading ? <span className="loading loading-spinner"></span> : 'Yükle ve Eğit'}
                    </button>
                </div>
            </div>
        </div>
    );
}
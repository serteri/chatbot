'use client';

import React, { useState } from 'react';

type Props = {
    chatbotId: string;
};

export default function DocumentUploader({ chatbotId }: Props) {
    const [status, setStatus] = useState<string>('');
    const [busy, setBusy] = useState(false);

    async function extractTxtText(file: File) {
        const text = await file.text();
        return text;
    }

    // 🔧 PDFJS v5 doğru kullanım
    async function extractPdfText(pdfFile: File): Promise<string> {

        const pdfjs: any = await import('pdfjs-dist');
        const worker: any = await import('pdfjs-dist/build/pdf.worker.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        const buf = await pdfFile.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: buf });
        const pdf = await loadingTask.promise;

        let full = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            full += textContent.items.map((it: any) => it.str).join(' ') + '\n';
        }
        return full;
    }

    async function handleFile(file: File) {
        setStatus('');
        if (!chatbotId) {
            setStatus('Lütfen bir chatbot seçin.');
            return;
        }

        try {
            setBusy(true);

            let text = '';
            if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
                text = await extractTxtText(file);
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                text = await extractPdfText(file);
            } else {
                setStatus('Sadece .txt ve .pdf destekleniyor.');
                return;
            }

            if (!text.trim()) {
                setStatus('Dosyadan metin çıkarılamadı.');
                return;
            }

            // ingest API
            const res = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    fileName: file.name,
                    chatbotId,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Yükleme başarısız oldu.');
            }
            setStatus(data?.message || 'Yükleme tamam.');
        } catch (e: any) {
            setStatus(e?.message || 'Beklenmeyen hata.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Bilgi Bankasını Güncelle</h3>
            <p className="text-sm mb-3">.txt veya .pdf dosyası yükleyerek AI’ı eğitin.</p>

            <input
                type="file"
                accept=".txt,.pdf"
                disabled={busy}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.currentTarget.value = '';
                }}
                className="file-input file-input-bordered w-full max-w-md"
            />

            <div className="mt-3 text-sm">
                {busy ? <span className="loading loading-dots loading-sm" /> : status}
            </div>
        </div>
    );
}
'use client';

import { useEffect, useState } from 'react';

type Bot = { id: string; name: string };

type Props = {
    /** İstersen dışarıdan sabit bot id geçebilirsin; geçmezsen bu bileşen dropdown ile seçtirir */
    chatbotId?: string;
};

export default function DocumentUploader({ chatbotId }: Props) {
    const [bots, setBots] = useState<Bot[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    // Etkin kullanılacak id (dışarıdan geldiyse onu, yoksa dropdown seçimi)
    const effectiveId = chatbotId || selectedId;

    useEffect(() => {
        let alive = true;
        // dışarıdan id gelmediyse, listeyi çek ve ilkini seç
        if (!chatbotId) {
            (async () => {
                try {
                    const res = await fetch('/api/my-chatbots');
                    const data = await res.json();
                    if (!alive) return;
                    if (Array.isArray(data) && data.length > 0) {
                        setBots(data);
                        setSelectedId(data[0].id);
                    } else {
                        setBots([]);
                        setSelectedId('');
                    }
                } catch {
                    if (alive) {
                        setBots([]);
                        setSelectedId('');
                    }
                }
            })();
        } else {
            setSelectedId(chatbotId);
        }
        return () => {
            alive = false;
        };
    }, [chatbotId]);

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setFile(f);
        setMsg(null);
        setErr(null);
    };

    async function extractPdfText(pdfFile: File): Promise<string> {
        // Dinamik import: Next/webpack’te daha stabil
        const pdfjsLib: any = await import('pdfjs-dist/build/pdf');
        // Bazı kurulumlarda worker’ı elle set etmek gerekir; hata alırsan aşağı satırı aktifleştir.
        // const worker: any = await import('pdfjs-dist/build/pdf.worker.entry');
        // pdfjsLib.GlobalWorkerOptions.workerSrc = worker;

        const data = await pdfFile.arrayBuffer();
        const task = pdfjsLib.getDocument({ data });
        const pdf = await task.promise;

        let out = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items
                .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
                .filter(Boolean);
            out += strings.join(' ') + '\n';
        }
        return out.trim();
    }

    const handleUpload = async () => {
        setMsg(null);
        setErr(null);

        if (!effectiveId) {
            setErr('Lütfen bir chatbot seçin.');
            return;
        }
        if (!file) {
            setErr('Lütfen .txt veya .pdf dosyası seçin.');
            return;
        }

        // 10MB üstünü engelle (server da kontrol ediyor ama UX için iyi)
        if (file.size > 10 * 1024 * 1024) {
            setErr('Dosya en fazla 10 MB olmalı.');
            return;
        }

        let text = '';
        try {
            setBusy(true);

            if (file.type === 'text/plain') {
                text = await file.text();
            } else if (file.type === 'application/pdf') {
                // PDF -> text
                text = await extractPdfText(file);
                if (!text.trim()) {
                    throw new Error('PDF metni çıkarılamadı. Dosya tarama/scan olabilir.');
                }
            } else {
                throw new Error('Sadece .txt veya .pdf destekleniyor.');
            }

            const res = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    fileName: file.name,
                    mimeType: file.type,
                    chatbotId: effectiveId,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Yükleme başarısız.');
            }

            setMsg(`✅ ${data?.message || 'Yükleme tamam.'}`);
            setFile(null);
            // Başarılıysa istersen burada bir “yenile” callback’i tetikleyebilirsin
        } catch (e: any) {
            setErr(e?.message || 'Bir hata oluştu.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body space-y-3">
                <h3 className="card-title">Bilgi Bankasını Güncelle</h3>
                <p className="text-sm text-gray-500">
                    .txt veya .pdf dosyası yükleyerek AI’ı eğitin.
                </p>

                {/* Chatbot seçimi */}
                {!chatbotId && (
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Chatbot seç</span>
                        </label>
                        <select
                            className="select select-bordered"
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                        >
                            {bots.length === 0 && <option value="">(Chatbot yok)</option>}
                            {bots.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Dosya seçimi */}
                <input
                    type="file"
                    accept=".txt,application/pdf"
                    className="file-input file-input-bordered w-full"
                    onChange={onFile}
                />

                {/* Durum */}
                {file && (
                    <div className="text-sm opacity-80">
                        Seçilen dosya: <b>{file.name}</b>
                    </div>
                )}
                {err && <div className="alert alert-error text-sm">{err}</div>}
                {msg && <div className="alert alert-success text-sm">{msg}</div>}

                {/* Aksiyon */}
                <div className="card-actions justify-end">
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handleUpload}
                        disabled={busy || !effectiveId || !file}
                        title={!effectiveId ? 'Lütfen chatbot seçin' : undefined}
                    >
                        {busy ? 'Yükleniyor...' : 'Yükle'}
                    </button>
                </div>
            </div>
        </div>
    );
}

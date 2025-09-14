'use client';

import React, { useState } from 'react';

type Props = { chatbotId: string };

export default function DocumentUploader({ chatbotId }: Props) {
    const [files, setFiles] = useState<FileList | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string>("");

    async function onUpload(e: React.FormEvent) {
        e.preventDefault();
        setMsg("");

        if (!chatbotId) return setMsg("Lütfen bir chatbot seçin.");
        if (!files || files.length === 0) return setMsg("Lütfen dosya seçin (.pdf, .txt, .md).");

        try {
            setBusy(true);

            const form = new FormData();
            form.append("chatbotId", chatbotId);
            Array.from(files).forEach((f) => form.append("files", f));

            const res = await fetch("/api/documents/upload", { method: "POST", body: form });
            const contentType = res.headers.get("content-type") || "";

            if (res.ok) {
                const data = contentType.includes("application/json") ? await res.json() : {};
                setMsg(`✅ Yükleme tamamlandı. Parça sayısı: ${data?.chunks ?? "—"}`);
                setFiles(null);
            } else {
                const errText = contentType.includes("application/json")
                    ? (await res.json())?.error ?? "Yükleme başarısız."
                    : await res.text();
                throw new Error(errText || "Yükleme başarısız.");
            }
        } catch (err: any) {
            setMsg(`❌ Hata: ${err?.message || "Beklenmeyen hata."}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Bilgi Bankasını Güncelle</h3>
            <p className="text-sm mb-3">.txt / .md / .pdf dosyaları yükleyerek AI’ı eğitebilirsiniz.</p>

            <form onSubmit={onUpload} className="flex flex-col gap-3 max-w-xl">
                <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md"
                    disabled={busy}
                    onChange={(e) => setFiles(e.target.files)}
                    className="file-input file-input-bordered w-full"
                />

                {files && files.length > 0 && (
                    <div className="text-xs opacity-80">
                        <div className="font-medium mb-1">Seçili dosyalar:</div>
                        <ul className="list-disc list-inside">
                            {Array.from(files).map((f) => (
                                <li key={f.name}>
                                    {f.name} <span className="opacity-60">({Math.round(f.size / 1024)} KB)</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={busy || !files || files.length === 0 || !chatbotId}
                    >
                        {busy ? <span className="loading loading-spinner" /> : "Yükle"}
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => { setFiles(null); setMsg(""); }}
                        disabled={busy}
                    >
                        Temizle
                    </button>
                </div>
            </form>

            {msg && <div className="mt-3 text-sm">{msg}</div>}
        </div>
    );
}

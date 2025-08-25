"use client";

import { useEffect, useState } from "react";

export default function DocumentsClient() {
    const [chatbotId, setChatbotId] = useState<string>("");
    const [rows, setRows] = useState<{ fileName: string; count: number }[]>([]);
    const [busy, setBusy] = useState(false);
    const [files, setFiles] = useState<FileList | null>(null);
    const [msg, setMsg] = useState<string>("");

    useEffect(() => {
        const fromEnv = (process.env.NEXT_PUBLIC_PUBLIC_CHATBOT_ID ?? "").trim();
        setChatbotId(fromEnv);
    }, []);

    async function load() {
        if (!chatbotId) return;
        const res = await fetch(`/api/documents?chatbotId=${encodeURIComponent(chatbotId)}`, { cache: "no-store" });
        const data = await res.json();
        setRows(data);
    }

    useEffect(() => { load(); }, [chatbotId]);

    async function onUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!chatbotId || !files || files.length === 0) return;
        setBusy(true); setMsg("");

        const form = new FormData();
        form.append("chatbotId", chatbotId);
        Array.from(files).forEach(f => form.append("files", f));

        const res = await fetch("/api/documents/upload", { method: "POST", body: form });
        if (!res.ok) {
            setMsg(await res.text());
        } else {
            const j = await res.json();
            setMsg(`Yüklendi. Parça sayısı: ${j.chunks}`);
            setFiles(null);
            await load();
        }
        setBusy(false);
    }

    async function onDelete(fileName: string) {
        if (!confirm(`Silinsin mi?\n${fileName}`)) return;
        setBusy(true);
        const res = await fetch(`/api/documents?chatbotId=${encodeURIComponent(chatbotId)}&fileName=${encodeURIComponent(fileName)}`, { method: "DELETE" });
        const j = await res.json().catch(()=>({}));
        setMsg(res.ok ? `Silindi: ${j.deleted}` : `Hata: ${await res.text()}`);
        await load();
        setBusy(false);
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold">Belgeler</h1>

            <div className="flex gap-2">
                <input
                    className="input input-bordered w-full"
                    placeholder="Chatbot ID"
                    value={chatbotId}
                    onChange={(e) => setChatbotId(e.target.value.trim())}
                />
                <button className="btn" onClick={load}>Yenile</button>
            </div>

            <form onSubmit={onUpload} className="flex items-center gap-3">
                <input
                    type="file"
                    multiple
                    className="file-input file-input-bordered w-full"
                    onChange={(e) => setFiles(e.target.files)}
                    accept=".pdf,.txt,.md"
                    disabled={busy}
                />
                <button className="btn btn-primary" disabled={busy || !chatbotId}>Yükle</button>
            </form>

            {msg && <div className="alert mt-2">{msg}</div>}

            <div className="overflow-x-auto">
                <table className="table">
                    <thead><tr><th>Dosya</th><th>Parça</th><th /></tr></thead>
                    <tbody>
                    {rows.map(r => (
                        <tr key={r.fileName}>
                            <td>{r.fileName}</td>
                            <td>{r.count}</td>
                            <td><button className="btn btn-sm btn-error" onClick={() => onDelete(r.fileName)} disabled={busy}>Sil</button></td>
                        </tr>
                    ))}
                    {!rows.length && (
                        <tr><td colSpan={3} className="opacity-60">Henüz belge yok.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

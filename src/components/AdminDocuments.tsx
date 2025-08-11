'use client';
import { useEffect, useState } from "react";

type Bot = { id: string; name: string };
type Doc = { id: string; content: string; createdAt: string };

export default function AdminDocuments() {
    const [bots, setBots] = useState<Bot[]>([]);
    const [selectedBot, setSelectedBot] = useState<string>("");
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loadingBots, setLoadingBots] = useState(true);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // Botları çek
    useEffect(() => {
        const loadBots = async () => {
            setLoadingBots(true);
            try {
                const res = await fetch("/api/chatbots");
                const data = await res.json();
                if (res.ok) {
                    setBots(data);
                    if (data.length > 0) setSelectedBot(data[0].id);
                }
            } finally {
                setLoadingBots(false);
            }
        };
        loadBots();
    }, []);

    // Seçilen botun dokümanlarını çek
    useEffect(() => {
        const loadDocs = async () => {
            if (!selectedBot) return;
            setLoadingDocs(true);
            try {
                const res = await fetch(`/api/chatbots/${selectedBot}/documents`);
                const data = await res.json();
                if (res.ok) setDocs(data);
                else setDocs([]);
            } finally {
                setLoadingDocs(false);
            }
        };
        loadDocs();
    }, [selectedBot]);

    const handleDelete = async (id: string) => {
        if (!confirm("Bu belge silinsin mi?")) return;
        const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
        if (res.ok) {
            setDocs((prev) => prev.filter((d) => d.id !== id));
        } else {
            alert("Silme başarısız");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">Dokümanlar</h2>
                {loadingBots ? (
                    <div className="skeleton h-8 w-48" />
                ) : (
                    <select
                        className="select select-bordered select-sm"
                        value={selectedBot}
                        onChange={(e) => setSelectedBot(e.target.value)}
                    >
                        {bots.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {loadingDocs ? (
                <div className="skeleton h-16 w-full" />
            ) : docs.length === 0 ? (
                <div className="p-4 bg-base-200 rounded">Bu bot için belge yok.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-zebra">
                        <thead>
                        <tr>
                            <th>Özet</th>
                            <th>Tarih</th>
                            <th className="text-right">İşlem</th>
                        </tr>
                        </thead>
                        <tbody>
                        {docs.map((d) => (
                            <tr key={d.id}>
                                <td className="max-w-xl truncate">
                                    {d.content.slice(0, 120)}{d.content.length > 120 ? "…" : ""}
                                </td>
                                <td>{new Date(d.createdAt).toLocaleString()}</td>
                                <td className="text-right">
                                    <button className="btn btn-error btn-xs" onClick={() => handleDelete(d.id)}>
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
    );
}
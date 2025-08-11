'use client';
import { useEffect, useState } from "react";
import Link from "next/link";

type Bot = { id: string; name: string };
type Conversation = { id: string; title: string; createdAt: string; userId: string };

export default function AdminConversations() {
    const [bots, setBots] = useState<Bot[]>([]);
    const [selectedBot, setSelectedBot] = useState<string>("");
    const [items, setItems] = useState<Conversation[]>([]);
    const [loadingBots, setLoadingBots] = useState(true);
    const [loadingList, setLoadingList] = useState(false);

    // botları çek
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

    // seçilen botun konuşmalarını çek
    useEffect(() => {
        const load = async () => {
            if (!selectedBot) return;
            setLoadingList(true);
            try {
                const res = await fetch(`/api/chatbots/${selectedBot}/conversations`);
                const data = await res.json();
                if (res.ok) setItems(data);
                else setItems([]);
            } finally {
                setLoadingList(false);
            }
        };
        load();
    }, [selectedBot]);

    const handleDelete = async (id: string) => {
        if (!confirm("Bu konuşma silinsin mi?")) return;
        const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        if (res.ok) {
            setItems(prev => prev.filter(x => x.id !== id));
        } else {
            alert("Silme başarısız");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">Konuşmalar</h2>
                {loadingBots ? (
                    <div className="skeleton h-8 w-48" />
                ) : (
                    <select
                        className="select select-bordered select-sm"
                        value={selectedBot}
                        onChange={(e) => setSelectedBot(e.target.value)}
                    >
                        {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                )}
            </div>

            {loadingList ? (
                <div className="skeleton h-16 w-full" />
            ) : items.length === 0 ? (
                <div className="p-4 bg-base-200 rounded">Bu bot için konuşma yok.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-zebra">
                        <thead>
                        <tr>
                            <th>Başlık</th>
                            <th>Oluşturan</th>
                            <th>Tarih</th>
                            <th className="text-right">İşlem</th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map((c) => (
                            <tr key={c.id}>
                                <td className="max-w-xl truncate">
                                    <Link href={`/conversations/${c.id}`} className="link">
                                        {c.title || "(başlıksız)"}
                                    </Link>
                                </td>
                                <td className="text-sm opacity-70">{c.userId}</td>
                                <td>{new Date(c.createdAt).toLocaleString()}</td>
                                <td className="text-right">
                                    <button className="btn btn-error btn-xs" onClick={() => handleDelete(c.id)}>
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
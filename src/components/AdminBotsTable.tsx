'use client';
import { useEffect, useState } from "react";

type Bot = { id: string; name: string };

export default function AdminBotsTable() {
    const [bots, setBots] = useState<Bot[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const res = await fetch("/api/chatbots");
        const data = await res.json();
        if (res.ok) setBots(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const del = async (id: string) => {
        if (!confirm("Bu bot silinsin mi?")) return;
        const res = await fetch(`/api/chatbots/${id}`, { method: "DELETE" });
        if (res.ok) load();
        else alert("Silme başarısız");
    };

    return (
        <div className="overflow-x-auto">
            <h2 className="text-xl font-semibold mb-2">Chatbotlar</h2>
            {loading ? (
                <div className="skeleton h-10 w-full" />
            ) : (
                <table className="table table-zebra">
                    <thead>
                    <tr>
                        <th>Ad</th>
                        <th className="text-right">İşlem</th>
                    </tr>
                    </thead>
                    <tbody>
                    {bots.map((b) => (
                        <tr key={b.id}>
                            <td>{b.name}</td>
                            <td className="text-right">
                                <button className="btn btn-sm btn-error" onClick={() => del(b.id)}>
                                    Sil
                                </button>
                            </td>
                        </tr>
                    ))}
                    {bots.length === 0 && (
                        <tr>
                            <td colSpan={2}>Bot yok</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
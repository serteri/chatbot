'use client';
import { useEffect, useState } from "react";

type Bot = { id: string; name: string };
type BotDetail = { id: string; name: string; systemPrompt: string | null; mode: "STRICT" | "FLEXIBLE" };

export default function AdminBotEditor() {
    const [bots, setBots] = useState<Bot[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [detail, setDetail] = useState<BotDetail | null>(null);
    const [loadingBots, setLoadingBots] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    // botları çek
    useEffect(() => {
        const loadBots = async () => {
            setLoadingBots(true);
            try {
                const res = await fetch("/api/chatbots");
                const data = await res.json();
                if (res.ok) {
                    setBots(data);
                    if (data.length > 0) setSelectedId(data[0].id);
                }
            } finally {
                setLoadingBots(false);
            }
        };
        loadBots();
    }, []);

    // bot detail çek
    useEffect(() => {
        const loadDetail = async () => {
            if (!selectedId) return;
            setLoadingDetail(true);
            try {
                const res = await fetch(`/api/chatbots/${selectedId}`);
                const data = await res.json();
                if (res.ok) setDetail(data);
                else setDetail(null);
            } finally {
                setLoadingDetail(false);
            }
        };
        loadDetail();
    }, [selectedId]);

    const save = async () => {
        if (!detail) return;
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch(`/api/chatbots/${detail.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: detail.name,
                    systemPrompt: detail.systemPrompt ?? "",
                    mode: detail.mode,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Kaydedilemedi");
            setMsg("✅ Kaydedildi");
        } catch (e: any) {
            setMsg(`❌ ${e.message || "Hata"}`);
        } finally {
            setSaving(false);
            setTimeout(() => setMsg(null), 2500);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Bot Düzenle</h2>

            <div className="flex items-center gap-3">
                <span>Bot</span>
                {loadingBots ? (
                    <div className="skeleton h-8 w-48" />
                ) : (
                    <select
                        className="select select-bordered select-sm"
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                    >
                        {bots.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                )}
            </div>

            {loadingDetail ? (
                <div className="skeleton h-24 w-full" />
            ) : detail ? (
                <div className="card bg-base-100 shadow">
                    <div className="card-body space-y-3">
                        {msg && <div className="alert text-sm">{msg}</div>}

                        <label className="form-control">
                            <span className="label-text">Ad</span>
                            <input
                                className="input input-bordered"
                                value={detail.name}
                                onChange={(e) => setDetail({ ...detail, name: e.target.value })}
                            />
                        </label>

                        <label className="form-control">
                            <span className="label-text">Mode</span>
                            <select
                                className="select select-bordered"
                                value={detail.mode}
                                onChange={(e) => setDetail({ ...detail, mode: e.target.value as "STRICT" | "FLEXIBLE" })}
                            >
                                <option value="STRICT">STRICT (sadece doküman)</option>
                                <option value="FLEXIBLE">FLEXIBLE (doküman + genel bilgi)</option>
                            </select>
                        </label>

                        <label className="form-control">
                            <span className="label-text">Sistem Prompt</span>
                            <textarea
                                className="textarea textarea-bordered min-h-32"
                                value={detail.systemPrompt ?? ""}
                                onChange={(e) => setDetail({ ...detail, systemPrompt: e.target.value })}
                                placeholder="Botun davranışı…"
                            />
                        </label>

                        <div className="flex justify-end">
                            <button className="btn btn-primary" onClick={save} disabled={saving}>
                                {saving ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-base-200 rounded">Bot bulunamadı.</div>
            )}
        </div>
    );
}
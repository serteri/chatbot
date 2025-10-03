"use client";

import { useEffect, useState } from "react";

type Mode = "STRICT" | "FLEXIBLE";

export default function BotSettingsClient() {
    const [botId, setBotId] = useState("");
    const [mode, setMode] = useState<Mode>("FLEXIBLE");
    const [systemPrompt, setSystemPrompt] = useState("");
    const [allowlistText, setAllowlistText] = useState("localhost,127.0.0.1");
    const [isPublic, setIsPublic] = useState(true);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        const fromEnv = (process.env.NEXT_PUBLIC_PUBLIC_CHATBOT_ID ?? "").trim();
        setBotId(fromEnv);
    }, []);

    async function load() {
        if (!botId) return;
        const r = await fetch(`/api/my-chatbots/${botId}`, { cache: "no-store" });
        if (!r.ok) { setMsg(await r.text()); return; }
        const j = await r.json();
        setMode(j.mode);
        setSystemPrompt(j.systemPrompt ?? "");
        setAllowlistText((j.embedAllowlist ?? []).join(","));
        setIsPublic(!!j.isPublic);
        setMsg("");
    }

    useEffect(() => { load(); }, [botId]);

    async function save() {
        const r = await fetch(`/api/my-chatbots/${botId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode,
                systemPrompt,
                embedAllowlist: allowlistText.split(",").map(s => s.trim()).filter(Boolean),
                isPublic,
            }),
        });
        setMsg(r.ok ? "Kaydedildi" : await r.text());
    }

    return (
        <div className="p-6 space-y-4 max-w-3xl mx-auto">
            <h1 className="text-2xl font-semibold">Bot Ayarları</h1>

            <div className="flex gap-2">
                <input className="input input-bordered w-full" placeholder="Chatbot ID"
                       value={botId} onChange={e=>setBotId(e.target.value.trim())}/>
                <button className="btn" onClick={load}>Yükle</button>
            </div>

            <div className="form-control">
                <label className="label"><span className="label-text">Mod</span></label>
                <select className="select select-bordered" value={mode} onChange={e=>setMode(e.target.value as Mode)}>
                    <option value="FLEXIBLE">FLEXIBLE (kaynak yoksa genel bilgi)</option>
                    <option value="STRICT">STRICT (sadece kaynak)</option>
                </select>
            </div>

            <div className="form-control">
                <label className="label"><span className="label-text">System Prompt</span></label>
                <textarea className="textarea textarea-bordered h-40"
                          value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)} />
            </div>

            <div className="form-control">
                <label className="label"><span className="label-text">Allowlist (virgülle)</span></label>
                <input className="input input-bordered"
                       value={allowlistText} onChange={e=>setAllowlistText(e.target.value)} />
                <label className="cursor-pointer label mt-2">
                    <span className="label-text">Public</span>
                    <input type="checkbox" className="toggle toggle-primary" checked={isPublic}
                           onChange={e=>setIsPublic(e.target.checked)} />
                </label>
            </div>

            <div className="flex gap-2">
                <button className="btn btn-primary" onClick={save} disabled={!botId}>Kaydet</button>
                {msg && <div className="alert">{msg}</div>}
            </div>
        </div>
    );
}

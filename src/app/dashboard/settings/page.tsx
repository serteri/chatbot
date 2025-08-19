'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatbotList from "@/components/ChatbotList";
import ChatbotDocuments from "@/components/ChatbotDocuments";
import EmbedCodeDisplay from "@/components/EmbedCodeDisplay";
import DocumentUploader from "@/components/DocumentUploader";
import ChatbotFiles from "@/components/ChatbotFiles.tsx";

export default function CreateChatbotPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
    const [refreshKey, setRefreshKey] = useState(0); // 👈 yeni state

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess(false);

        try {
            const res = await fetch("/api/chatbots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, systemPrompt }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Bir hata oluştu");

            setSuccess(true);
            setName("");
            setSystemPrompt("");
            setRefreshKey((prev) => prev + 1); // 👈 yenile
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-6">
            <h1 className="text-3xl font-bold">Yeni Chatbot Oluştur</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="alert alert-error text-sm">{error}</div>}
                {success && (
                    <div className="alert alert-success text-sm">Chatbot oluşturuldu!</div>
                )}

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Chatbot Adı</span>
                    </label>
                    <input
                        type="text"
                        className="input input-bordered"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Sistem Prompt'u</span>
                    </label>
                    <textarea
                        className="textarea textarea-bordered"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={4}
                        placeholder="Kullanıcıya nasıl davranmalı? (Örn: Nazik ve kısa cevaplar ver.)"
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={isLoading}
                >
                    {isLoading ? "Oluşturuluyor..." : "Chatbot Oluştur"}
                </button>
            </form>

            {/* ✅ Chatbot listesi seçimi */}
            <div className="mt-10">
                <h2 className="text-xl font-bold mb-2">Mevcut Chatbotlar</h2>
                <ChatbotList onSelect={(id) => setSelectedChatbotId(id)} refreshKey={refreshKey} />
            </div>

            {/* ✅ Chatbot'a özel doküman ve embed alanı */}
            {selectedChatbotId && (
                <div className="mt-10 space-y-6">
                    <DocumentUploader chatbotId={selectedChatbotId} />
                    <ChatbotFiles chatbotId={selectedChatbotId} />
                    <ChatbotDocuments chatbotId={selectedChatbotId} />
                    <EmbedCodeDisplay chatbotId={selectedChatbotId} />
                </div>
            )}
        </div>
    );
}

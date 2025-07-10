'use client';
import { useState } from "react";

// Component artık başlangıç verisini dışarıdan alacak
export default function SettingsForm({ chatbot }: { chatbot: { id: string, systemPrompt: string | null } }) {
    const [prompt, setPrompt] = useState(chatbot.systemPrompt || '');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async () => {
        setIsLoading(true);
        setMessage('');
        // Metot artık POST değil PATCH olacak
        const res = await fetch('/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt: prompt, chatbotId: chatbot.id })
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Başarıyla kaydedildi!');
        } else {
            setMessage(`Hata: ${data.error}`);
        }
        setIsLoading(false);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title">Chatbot Kişiliğini Özelleştir</h2>
                <p className="text-sm opacity-60">Chatbot'unuzun nasıl davranacağını, hangi rolde olacağını buraya yazın.</p>
                <textarea
                    className="textarea textarea-bordered w-full mt-4"
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Örn: Sen, Antik Roma tarihi konusunda uzman, esprili bir tarihçisin..."
                ></textarea>
                {message && <p className="text-sm text-center text-success mt-2">{message}</p>}
                <div className="card-actions justify-end mt-2">
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isLoading || prompt === chatbot.systemPrompt}
                    >
                        {isLoading ? <span className="loading loading-spinner"></span> : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    )
}
"use client";

import { useEffect, useState } from "react";

interface Document {
    id: string;
    content: string;
    createdAt: string;
}

interface Props {
    chatbotId: string;
}

export default function ChatbotDocuments({ chatbotId }: Props) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!chatbotId) return;

        const fetchDocuments = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/chatbots/${chatbotId}/documents`);
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || "Bir hata oluştu");

                setDocuments(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [chatbotId]);

    if (!chatbotId) return null;

    return (
        <div className="mt-10">
            <h3 className="text-xl font-bold mb-2">Yüklenen Belgeler</h3>
            {loading ? (
                <p>Yükleniyor...</p>
            ) : error ? (
                <div className="alert alert-error">{error}</div>
            ) : documents.length === 0 ? (
                <p>Henüz belge yüklenmemiş.</p>
            ) : (
                <ul className="list-disc pl-5 space-y-2 text-sm">
                    {documents.map((doc) => (
                        <li key={doc.id}>
                            {doc.content.slice(0, 100)}...
                            <br />
                            <span className="text-xs text-gray-500">
                {new Date(doc.createdAt).toLocaleDateString("tr-TR")}
              </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
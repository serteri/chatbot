// src/components/ChatbotDocumentsManager.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import DocumentUploader from "./DocumentUploader";
import ChatbotFiles from "./ChatbotFiles";

type Props = {
    chatbotId: string;
};

export default function ChatbotDocumentsManager({ chatbotId }: Props) {
    const [filesData, setFilesData] = useState<any>({ items: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const load = useCallback(async () => {
        if (!chatbotId) {
            setFilesData({ items: [] });
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/chatbots/${encodeURIComponent(chatbotId)}/files?ts=${Date.now()}`,
                { cache: "no-store" }
            );
            if (!res.ok) throw new Error(await res.text() || "Dosya listesi alınamadı.");
            const data = await res.json();
            setFilesData(data);
        } catch (e: any) {
            setError(e);
            setFilesData({ items: [] });
        } finally {
            setIsLoading(false);
        }
    }, [chatbotId]);

    // Chatbot ID'si değiştiğinde verileri yeniden yükle
    useEffect(() => {
        load();
    }, [load]);

    // Dosya yüklendiğinde fırlatılan event'i dinle ve listeyi yenile
    useEffect(() => {
        const handler = () => load();
        window.addEventListener("documents:changed", handler);
        return () => window.removeEventListener("documents:changed", handler);
    }, [load]);

    return (
        <div className="space-y-6">
            <DocumentUploader chatbotId={chatbotId} />
            <ChatbotFiles
                chatbotId={chatbotId}
                filesData={filesData}
                isLoading={isLoading}
                error={error}
                onDeleteSuccess={load}
                onRefreshRequest={load}
            />
        </div>
    );
}
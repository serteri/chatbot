'use client';

import { useEffect, useState } from 'react';

type FileGroup = {
    fileName: string;
    docCount: number;
    lastUploadedAt: string | null;
};

export default function ChatbotDocuments({ chatbotId }: { chatbotId: string }) {
    const [rows, setRows] = useState<FileGroup[]>([]);
    const [groups, setGroups] = useState<FileGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ fileName: string; text: string } | null>(null);
    const [busyDelete, setBusyDelete] = useState<string | null>(null);

    async function fetchRows() {
        if (!chatbotId) return;
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(`/api/chatbots/${chatbotId}/files` ,{
                cache: "no-store",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Liste alınamadı');
            // son yüklenme tarihine göre sırala (yeniden eskiye)
            data.sort((a: FileGroup, b: FileGroup) => {
                const ta = a.lastUploadedAt ? new Date(a.lastUploadedAt).getTime() : 0;
                const tb = b.lastUploadedAt ? new Date(b.lastUploadedAt).getTime() : 0;
                return tb - ta;
            });
            setGroups(data);
        } catch (e: any) {
            setErr(e?.message || 'Hata');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchRows();
    }, [chatbotId]);

    async function handlePreview(fileName: string) {
        try {
            const res = await fetch(`/api/chatbots/${chatbotId}/documents?fileName=${encodeURIComponent(fileName)}&limit=1`);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Önizleme alınamadı');
            const first = Array.isArray(data) && data[0]?.content ? data[0].content : '(içerik yok)';
            setPreview({ fileName, text: first.slice(0, 1000) });
        } catch (e: any) {
            setPreview({ fileName, text: e?.message || 'Hata' });
        }
    }

    const handleDeleteFile = async (fileName: string) => {
        const ok = confirm(
            `"${fileName}" adlı dosyanın tüm parçalarını silmek istediğinize emin misiniz?`
        );
        if (!ok) return;
        try {
            const res = await fetch(
                `/api/chatbots/${chatbotId}/files?fileName=${encodeURIComponent(fileName)}`,
                { method: "DELETE" }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Silinemedi");
            await fetchRows();
        } catch (e: any) {
            alert(e.message || "Silme sırasında hata oluştu");
        }
    };

    if (!chatbotId) {
        return (
            <div className="p-4 bg-base-200 rounded">
                <p>Lütfen bir chatbot seçin.</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-base-100 rounded shadow space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Yüklenmiş Dosyalar</h3>
                <button className="btn btn-sm" onClick={fetchRows} disabled={loading}>
                    Yenile
                </button>
            </div>

            {err && <div className="alert alert-error">{err}</div>}
            {loading && <div className="skeleton h-8 w-full" />}

            {groups.length === 0 && !loading ? (
                <div className="text-sm text-gray-500">
                    Henüz bu chatbot için yüklenmiş bir dosya yok.
                </div>
            ) : (
                <div className="space-y-2">
                    {groups.map((g) => (
                        <div
                            key={g.fileName}
                            className="flex items-center justify-between p-3 border rounded hover:bg-base-200"
                        >
                            <div>
                                <div className="font-medium">{g.fileName}</div>
                                <div className="text-xs text-gray-500">
                                    Parça sayısı: {g.docCount}{" "}
                                    {g.lastUploadedAt && (
                                        <>• Son: {new Date(g.lastUploadedAt).toLocaleString("tr-TR")}</>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* İstersen buraya “detayları gör” linki de ekleyebiliriz */}
                                <button
                                    className="btn btn-outline btn-error btn-sm"
                                    onClick={() => handleDeleteFile(g.fileName)}
                                >
                                    Sil
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

'use client';

import { useEffect, useState } from "react";

type FileItem = {
    fileName: string;
    docCount: number;
    lastUpdatedAt: string | null;
};

export default function ChatbotFiles({ chatbotId }: { chatbotId: string }) {
    const [items, setItems] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!chatbotId) return;
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/chatbots/${chatbotId}/files`, { cache: "no-store" });
                const data = await res.json();
                if (!alive) return;
                setItems(Array.isArray(data.items) ? data.items : []);
            } catch {
                if (alive) setItems([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [chatbotId, refreshKey]);

    async function handleDelete(fileName: string) {
        if (!confirm(`'${fileName}' dosyasının TÜM parçalarını silmek istediğinize emin misiniz?`)) return;
        const res = await fetch(`/api/chatbots/${chatbotId}/files?fileName=${encodeURIComponent(fileName)}`, {
            method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data?.error || "Silme hatası");
            return;
        }
        // listeyi yenile
        setRefreshKey((k) => k + 1);
    }

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body">
                <h3 className="card-title text-lg">Yüklenen Dosyalar</h3>

                {loading ? (
                    <div className="skeleton h-16 w-full" />
                ) : items.length === 0 ? (
                    <p className="text-sm opacity-70">Henüz dosya yüklenmemiş.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                            <tr>
                                <th>Dosya</th>
                                <th>Parça Sayısı</th>
                                <th>Son Güncelleme</th>
                                <th className="text-right">İşlemler</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((it) => (
                                <tr key={it.fileName}>
                                    <td className="font-medium">{it.fileName}</td>
                                    <td>{it.docCount}</td>
                                    <td>{it.lastUpdatedAt ? new Date(it.lastUpdatedAt).toLocaleString() : "-"}</td>
                                    <td className="text-right space-x-2">
                                        <button
                                            className="btn btn-xs btn-outline"
                                            onClick={() => setSelectedFile(it.fileName)}
                                        >
                                            Parçaları gör
                                        </button>
                                        <button
                                            className="btn btn-xs btn-error"
                                            onClick={() => handleDelete(it.fileName)}
                                        >
                                            Sil (toplu)
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedFile && (
                    <FileChunksModal
                        chatbotId={chatbotId}
                        fileName={selectedFile}
                        onClose={() => setSelectedFile(null)}
                        onAnyDelete={() => setRefreshKey((k) => k + 1)}
                    />
                )}
            </div>
        </div>
    );
}

/** Modal: tek dosyanın parçalarını gösterir ve tek tek silmeyi sağlar */
function FileChunksModal({
                             chatbotId,
                             fileName,
                             onClose,
                             onAnyDelete,
                         }: {
    chatbotId: string;
    fileName: string;
    onClose: () => void;
    onAnyDelete?: () => void;
}) {
    const [chunks, setChunks] = useState<
        { id: string; chunkIndex: number | null; createdAt: string; preview: string }[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `/api/chatbots/${chatbotId}/file-chunks?fileName=${encodeURIComponent(fileName)}`,
                    { cache: "no-store" }
                );
                const data = await res.json();
                if (!alive) return;
                setChunks(Array.isArray(data.chunks) ? data.chunks : []);
            } catch {
                if (alive) setChunks([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [chatbotId, fileName, refreshKey]);

    async function deleteChunk(id: string) {
        if (!confirm("Bu parçayı silmek istediğinize emin misiniz?")) return;
        const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
            alert(data?.error || "Silme hatası");
            return;
        }
        setRefreshKey((k) => k + 1);
        onAnyDelete?.();
    }

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-4xl">
                <h3 className="font-bold text-lg mb-2">Parçalar: {fileName}</h3>
                {loading ? (
                    <div className="skeleton h-20 w-full" />
                ) : chunks.length === 0 ? (
                    <p className="text-sm opacity-70">Parça bulunamadı.</p>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {chunks.map((c) => (
                            <div key={c.id} className="p-3 border rounded flex items-start gap-3">
                                <div className="text-xs opacity-60 w-28 shrink-0">
                                    #{c.chunkIndex ?? "-"}<br />
                                    {new Date(c.createdAt).toLocaleString()}
                                </div>
                                <div className="flex-1 text-sm whitespace-pre-wrap">{c.preview}</div>
                                <button className="btn btn-xs btn-error" onClick={() => deleteChunk(c.id)}>
                                    Sil
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Kapat</button>
                </div>
            </div>
        </div>
    );
}

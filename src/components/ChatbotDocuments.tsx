'use client';

import { useEffect, useState } from 'react';

type FileRow = { fileName: string; docCount: number; latestAt: string };

export default function ChatbotDocuments({ chatbotId }: { chatbotId: string }) {
    const [rows, setRows] = useState<FileRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ fileName: string; text: string } | null>(null);
    const [busyDelete, setBusyDelete] = useState<string | null>(null);

    async function fetchRows() {
        if (!chatbotId) return;
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(`/api/chatbots/${chatbotId}/files`);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Liste alınamadı');
            setRows(data);
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

    async function handleDelete(fileName: string) {
        if (!confirm(`'${fileName}' adlı dosyaya ait tüm parçaları silmek istediğine emin misin?`)) return;
        setBusyDelete(fileName);
        try {
            const res = await fetch(`/api/chatbots/${chatbotId}/files?fileName=${encodeURIComponent(fileName)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Silme başarısız');
            await fetchRows();
        } catch (e: any) {
            alert(e?.message || 'Silme sırasında hata.');
        } finally {
            setBusyDelete(null);
        }
    }

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body">
                <div className="flex items-center justify-between">
                    <h3 className="card-title">Yüklenen Belgeler</h3>
                    <button className="btn btn-ghost btn-xs" onClick={fetchRows} disabled={loading}>
                        Yenile
                    </button>
                </div>

                {err && <div className="alert alert-error text-sm">{err}</div>}
                {loading ? (
                    <div className="skeleton h-10 w-full" />
                ) : rows.length === 0 ? (
                    <div className="text-sm opacity-70">Henüz dosya yok.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                            <tr>
                                <th>Dosya adı</th>
                                <th>Parça sayısı</th>
                                <th>Son güncelleme</th>
                                <th className="text-right">Aksiyon</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map((r) => (
                                <tr key={r.fileName}>
                                    <td className="font-medium">{r.fileName}</td>
                                    <td>{r.docCount}</td>
                                    <td>{new Date(r.latestAt).toLocaleString('tr-TR')}</td>
                                    <td className="text-right space-x-2">
                                        <button className="btn btn-outline btn-xs" onClick={() => handlePreview(r.fileName)}>
                                            Önizle
                                        </button>
                                        <button
                                            className="btn btn-error btn-xs"
                                            onClick={() => handleDelete(r.fileName)}
                                            disabled={busyDelete === r.fileName}
                                        >
                                            {busyDelete === r.fileName ? 'Siliniyor...' : 'Sil'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Basit önizleme paneli */}
                {preview && (
                    <div className="mt-4 border rounded p-3 bg-base-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">Önizleme: {preview.fileName}</div>
                            <button className="btn btn-ghost btn-xs" onClick={() => setPreview(null)}>Kapat</button>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm max-h-80 overflow-auto">{preview.text}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}

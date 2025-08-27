import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type GroupRow = {
    fileName: string | null;
    _count: { fileName: number };
    _max: { createdAt: Date | null };
};
// GET /api/chatbots/:chatbotId/files
// -> [{ fileName, docCount, latestAt }]
export async function GET(_req: Request, { params }: { params: { chatbotId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const userId = session.user.id;
    const { chatbotId } = params;

    try {

        // 🔐 Güvenlik: bu bot gerçekten bu kullanıcıya mı ait?
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId },
            select: { id: true },
        });
        if (!bot) {
            return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });
        }

        // fileName NULL olanları elemine et
        const groups = await prisma.document.groupBy({
            by: ["fileName"] as const,                // ✔ önemli
            where: { userId, chatbotId, NOT: { fileName: null } },
            _count: { fileName: true },               // ✔ _all yerine fileName
            _max: { createdAt: true },

        });

        // JS tarafında sayıya göre DESC sırala
        const items = groups
            .filter((g) => typeof g.fileName === "string" && g.fileName.length > 0)
            .map((g) => ({
                fileName: g.fileName as string,
                docCount: g._count.fileName,
                lastUpdatedAt: g._max.createdAt,
            }))
            // en çok parçası olan öne, eşitse son yüklenene göre
            .sort((a, b) => {
                if (b.docCount !== a.docCount) return b.docCount - a.docCount;
                const ta = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
                const tb = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
                return tb - ta;
            });
        return NextResponse.json(items);
    } catch (e) {
        console.error("GET /files error:", e);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// DELETE /api/chatbots/:chatbotId/files?fileName=...
// -> aynı dosyaya ait TÜM chunk’ları siler
export async function DELETE( req: Request,
                              { params }: { params: { chatbotId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const userId = session.user.id;
    const { chatbotId } = params;



    try {
        const url = new URL(req.url);
        const fileName = url.searchParams.get("fileName");

        if (!fileName) {
            return NextResponse.json({ error: "fileName gerekli" }, { status: 400 });
        }

        // 🔐 Güvenlik: bu bot gerçekten bu kullanıcıya mı ait?
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId },
            select: { id: true },
        });
        if (!bot) {
            return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });
        }

        const del = await prisma.document.deleteMany({
            where: { userId, chatbotId, fileName },
        });

        return NextResponse.json({ success: true, deleted: del.count });
    } catch (e) {
        console.error("DELETE /files error:", e);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

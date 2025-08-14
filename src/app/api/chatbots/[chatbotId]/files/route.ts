import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface Ctx { params: { chatbotId: string } }

// GET /api/chatbots/:chatbotId/files
// -> [{ fileName, docCount, latestAt }]
export async function GET(_req: Request, { params }: Ctx) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const userId = session.user.id;
    const { chatbotId } = params;

    try {
        // fileName NULL olanları elemine et
        const groups = await prisma.document.groupBy({
            by: ["fileName"],
            where: {
                userId,
                chatbotId,
                NOT: { fileName: null },
            },
            _count: { _all: true },
            _max: { createdAt: true },
        });

        const items = groups
            .filter(g => g.fileName) // type guard
            .map(g => ({
                fileName: g.fileName as string,
                docCount: g._count._all,
                latestAt: g._max.createdAt,
            }));

        return NextResponse.json(items);
    } catch (e) {
        console.error("GET /files error:", e);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// DELETE /api/chatbots/:chatbotId/files?fileName=...
// -> aynı dosyaya ait TÜM chunk’ları siler
export async function DELETE(req: Request, { params }: Ctx) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const userId = session.user.id;
    const { chatbotId } = params;

    const url = new URL(req.url);
    const fileName = url.searchParams.get("fileName");

    if (!fileName) {
        return NextResponse.json({ error: "fileName gerekli" }, { status: 400 });
    }

    try {
        const del = await prisma.document.deleteMany({
            where: { userId, chatbotId, fileName },
        });

        return NextResponse.json({ success: true, deleted: del.count });
    } catch (e) {
        console.error("DELETE /files error:", e);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

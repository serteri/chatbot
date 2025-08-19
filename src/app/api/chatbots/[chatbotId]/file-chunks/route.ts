import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { chatbotId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const userId = session.user.id;
    const chatbotId = params.chatbotId;

    try {
        const url = new URL(req.url);
        const fileName = url.searchParams.get("fileName");
        if (!fileName) {
            return NextResponse.json({ error: "fileName gerekli" }, { status: 400 });
        }

        // 🔐 Bot sahipliği
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId },
            select: { id: true },
        });
        if (!bot) return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });

        const docs = await prisma.document.findMany({
            where: { userId, chatbotId, fileName },
            select: { id: true, chunkIndex: true, createdAt: true, content: true },
            orderBy: [
                { chunkIndex: "asc" },          // varsa chunk sırasına göre
                { createdAt: "asc" },           // yoksa tarihi
            ],
        });

        const chunks = docs.map((d) => ({
            id: d.id,
            chunkIndex: d.chunkIndex ?? null,
            createdAt: d.createdAt,
            preview: d.content.length > 140 ? d.content.slice(0, 140) + "…" : d.content,
        }));

        return NextResponse.json({ chunks });
    } catch (err) {
        console.error("FILE-CHUNKS GET error:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface Ctx { params: { chatbotId: string } }

export async function GET(_req: Request, { params }: Ctx) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "İzin yok" }, { status: 403 });

    const orgId = session.user.organizationId;
    const { chatbotId } = params;

    try {
        // bot gerçekten bu org’a mı ait?
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, organizationId: orgId },
            select: { id: true },
        });
        if (!bot) return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });

        const conversations = await prisma.conversation.findMany({
            where: { chatbotId, chatbot: { organizationId: orgId } },
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, createdAt: true, userId: true },
        });

        return NextResponse.json(conversations);
    } catch (err) {
        console.error("Admin conversations GET hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
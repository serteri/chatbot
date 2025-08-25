import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId") || "";
    if (!chatbotId) return new Response("chatbotId gerekli", { status: 400 });

    const rows = await prisma.document.groupBy({
        by: ["fileName"],
        where: { chatbotId, userId: session.user.id },
        _count: { fileName: true },
    });

    return Response.json(rows.map(r => ({ fileName: r.fileName, count: r._count.fileName })));
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId") || "";
    const fileName = searchParams.get("fileName") || "";
    if (!chatbotId || !fileName) return new Response("chatbotId ve fileName gerekli", { status: 400 });

    // Sahiplik doğrulama
    const bot = await prisma.chatbot.findFirst({
        where: { id: chatbotId, userId: session.user.id, organizationId: session.user.organizationId || undefined },
        select: { id: true },
    });
    if (!bot) return new Response("Erişim yok (bot)", { status: 403 });

    const del = await prisma.document.deleteMany({
        where: { chatbotId, userId: session.user.id, fileName },
    });

    return Response.json({ ok: true, deleted: del.count });
}

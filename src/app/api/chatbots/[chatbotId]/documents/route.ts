import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getParamFromUrl } from "@/lib/routeParams";

export const runtime = "nodejs";

// GET /api/chatbots/:chatbotId/documents  → dosya adına göre grup + sayaç
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const chatbotId = getParamFromUrl(req, "chatbots");
    if (!chatbotId) return new Response("chatbotId yok", { status: 400 });

    // sahiplik
    const bot = await prisma.chatbot.findFirst({
        where: { id: chatbotId, userId: session.user.id },
        select: { id: true },
    });
    if (!bot) return new Response("Bot bulunamadı", { status: 404 });

    const rows = await prisma.document.groupBy({
        by: ["fileName"],
        where: { chatbotId, userId: session.user.id },
        _count: { fileName: true },
    });

    return Response.json(rows.map(r => ({ fileName: r.fileName, count: r._count.fileName })));
}
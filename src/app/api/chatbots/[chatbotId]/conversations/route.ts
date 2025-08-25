// src/app/api/chatbots/[chatbotId]/conversations/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Context = { params: { chatbotId: string } };

export async function GET(_req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new Response("Yetkisiz", { status: 401 });
    }

    const { chatbotId } = params;

    // Bot sahipliği kontrolü (gerekirse org kontrolü ekleyebilirsin)
    const bot = await prisma.chatbot.findFirst({
        where: { id: chatbotId, userId: session.user.id },
        select: { id: true },
    });
    if (!bot) {
        return new Response("Bot bulunamadı", { status: 404 });
    }

    const convs = await prisma.conversation.findMany({
        where: { chatbotId, userId: session.user.id },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return Response.json(convs);
}

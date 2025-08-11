import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

interface RouteContext {
    params: {
        chatbotId: string;
    };
}

export async function GET(req: Request, { params }: RouteContext) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), {
            status: 401,
        });
    }

    const userId = session.user.id;
    const orgId  = session.user.organizationId;
    const chatbotId = params.chatbotId;



    try {
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId, organizationId: orgId },
            select: { id: true },
        });
        if (!bot) {
            return new NextResponse(JSON.stringify({ error: "Chatbot bulunamadı" }), { status: 404 });
        }
        const documents = await prisma.document.findMany({
            where: {
                userId,
                chatbotId,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
            },
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error("Belge listesi hatası:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), {
            status: 500,
        });
    }
}
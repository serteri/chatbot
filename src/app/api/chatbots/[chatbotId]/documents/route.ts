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
    const chatbotId = params.chatbotId;

    try {
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
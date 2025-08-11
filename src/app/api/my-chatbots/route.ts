import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }
    const userId = session.user.id;
    const orgId  = session.user.organizationId;

    try {
        const chatbots = await prisma.chatbot.findMany({
            where: { userId, organizationId: orgId },
            select: { id: true, name: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(chatbots);
    } catch (error) {
        console.error("Chatbot listesi alınamadı:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), {
            status: 500,
        });
    }
}
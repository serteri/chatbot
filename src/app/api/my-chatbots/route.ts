import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }

    try {
        const chatbots = await prisma.chatbot.findMany({
            where: { userId: session.user.id },
            select: { id: true, name: true, createdAt: true }
        });

        return NextResponse.json(chatbots);
    } catch (error) {
        console.error("Chatbot listesi alınamadı:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), {
            status: 500,
        });
    }
}
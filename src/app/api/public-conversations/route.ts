import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");

    if (!chatbotId) {
        return new NextResponse(JSON.stringify({ error: "Chatbot ID eksik" }), { status: 400 });
    }

    try {
        const conversations = await prisma.conversation.findMany({
            where: { chatbotId },
            select: { id: true, title: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(conversations);
    } catch (err) {
        console.error("❌ Conversation fetch error:", err);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), { status: 500 });
    }
}
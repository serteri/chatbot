import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getParamFromUrl } from "@/lib/routeParams";



export async function GET(req: Request) {
    const chatbotId = getParamFromUrl(req, "chatbots");

    try {
        const conversations = await prisma.conversation.findMany({
            where: { chatbotId },
            select: { id: true, title: true, createdAt: true, messages: true }
        });

        return NextResponse.json(conversations);
    } catch (error) {
        console.error("Chatbot geçmişi çekerken hata:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucuda bir hata oluştu" }), { status: 500 });
    }
}
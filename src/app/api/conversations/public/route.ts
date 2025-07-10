import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const chatbotId = url.searchParams.get("chatbotId");

    if (!chatbotId) {
        return new NextResponse(JSON.stringify([]));
    }

    const conversations = await prisma.conversation.findMany({
        where: { chatbotId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, createdAt: true }
    });
    return NextResponse.json(conversations);
}
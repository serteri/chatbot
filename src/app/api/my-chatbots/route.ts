// src/app/api/my-chatbots/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json([], { status: 401 });
    }
    const userId = session.user.id;

    try {
        const chatbots = await prisma.chatbot.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }, // En yeniden eskiye sırala
        });
        return NextResponse.json(chatbots);
    } catch (error) {
        console.error("Chatbot listeleme hatası:", error);
        return NextResponse.json({ error: "Sunucuda bir hata oluştu." }, { status: 500 });
    }
}
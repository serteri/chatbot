import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Sadece kullanıcının mevcut chatbot ayarlarını GETİRİR.
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }
    const chatbot = await prisma.chatbot.findFirst({ where: { userId: session.user.id } });
    return NextResponse.json(chatbot);
}

// Yeni bir varsayılan chatbot OLUŞTURUR.
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }
    const existingChatbot = await prisma.chatbot.findFirst({ where: { userId: session.user.id } });
    if(existingChatbot) return NextResponse.json(existingChatbot);

    const chatbot = await prisma.chatbot.create({
        data: { userId: session.user.id, name: "Varsayılan Chatbot", systemPrompt: "Sen, yardımsever bir asistansın." }
    });
    return NextResponse.json(chatbot, { status: 201 });
}

// Mevcut bir chatbot'u GÜNCELLER.
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }
    const { systemPrompt, chatbotId } = await req.json();
    if (!chatbotId) return new NextResponse(JSON.stringify({ error: "Chatbot ID'si eksik" }), { status: 400 });

    const updatedChatbot = await prisma.chatbot.update({
        where: { id: chatbotId, userId: session.user.id },
        data: { systemPrompt: systemPrompt }
    });
    return NextResponse.json(updatedChatbot);
}
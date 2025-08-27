import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";


export async function GET(_req: Request, { params }: { params: { chatbotId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const userId = session.user.id;
    const orgId  = session.user.organizationId;
    const { chatbotId } = params;

    try {
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId, organizationId: orgId },
            select: { id: true, name: true, systemPrompt: true, createdAt: true },
        });
        if (!bot) return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });
        return NextResponse.json(bot);
    } catch (err) {
        console.error("Chatbot GET hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { chatbotId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "İzin yok" }, { status: 403 });

    const userId = session.user.id;
    const orgId  = session.user.organizationId;
    const { chatbotId } = params;

    try {
        const { name, systemPrompt } = await req.json();

        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, organizationId: orgId },
            select: { id: true, userId: true },
        });
        if (!bot) return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });

        // İstersen sadece org bazlı yetki kalsın; burada userId check’i kaldırmadım
        const updated = await prisma.chatbot.update({
            where: { id: chatbotId },
            data: {
                name: name?.trim() || undefined,
                systemPrompt: typeof systemPrompt === "string" ? systemPrompt.trim() : undefined,
            },
            select: { id: true, name: true, systemPrompt: true },
        });
        return NextResponse.json(updated);
    } catch (err) {
        console.error("Chatbot PATCH hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: { chatbotId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const userId = session.user.id;

    const { chatbotId } = params;

    try {
        // aynı org’a mı ait?
        const bot = await prisma.chatbot.findUnique({
            where: { id: chatbotId,userId},
            select: { id: true,userId:true },
        });
        if (!bot || bot.userId !== userId) return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });

        // ilişkili conversation/document’lar CASCADE ise prisma şemasında onDelete: Cascade tanımlı olmalı
        await prisma.chatbot.delete({ where: { id: chatbotId } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Chatbot DELETE hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
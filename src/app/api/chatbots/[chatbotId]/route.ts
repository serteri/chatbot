import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PromptMode } from "@prisma/client";

interface Ctx { params: { chatbotId: string } }

export async function GET(_req: Request, { params }: Ctx) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const userId = session.user.id;
    const orgId  = session.user.organizationId;
    const { chatbotId } = params;

    try {
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId, organizationId: orgId },
            select: { id: true, name: true, systemPrompt: true, mode: true, createdAt: true },
        });
        if (!bot) return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });
        return NextResponse.json(bot);
    } catch (err) {
        console.error("Chatbot GET hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: Ctx) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "İzin yok" }, { status: 403 });


    const orgId  = session.user.organizationId;
    const { chatbotId } = params;

    try {
        const { name, systemPrompt, mode } = await req.json() as {
            name?: string;
            systemPrompt?: string;
            mode?: PromptMode | "STRICT" | "FLEXIBLE";
        };

        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, organizationId: orgId },
            select: { id: true },
        });
        if (!bot) return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });

// mode doğrulaması
        let nextMode: PromptMode | undefined = undefined;
        if (typeof mode === "string") {
            if (mode !== "STRICT" && mode !== "FLEXIBLE") {
                return NextResponse.json({ error: "Geçersiz mode" }, { status: 400 });
            }
            nextMode = mode as PromptMode;
        }

        // İstersen sadece org bazlı yetki kalsın; burada userId check’i kaldırmadım
        const updated = await prisma.chatbot.update({
            where: { id: chatbotId },
            data: {
                name: typeof name === "string" ? name.trim() : undefined,
                systemPrompt: typeof systemPrompt === "string" ? systemPrompt.trim() : undefined,
                mode: nextMode,
            },
            select: { id: true, name: true, systemPrompt: true, mode: true},
        });
        return NextResponse.json(updated);
    } catch (err) {
        console.error("Chatbot PATCH hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: Ctx) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "İzin yok" }, { status: 403 });

    const orgId = session.user.organizationId;
    const { chatbotId } = params;

    try {
        // aynı org’a mı ait?
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, organizationId: orgId },
            select: { id: true },
        });
        if (!bot) return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });

        // ilişkili conversation/document’lar CASCADE ise prisma şemasında onDelete: Cascade tanımlı olmalı
        await prisma.chatbot.delete({ where: { id: chatbotId } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Chatbot DELETE hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
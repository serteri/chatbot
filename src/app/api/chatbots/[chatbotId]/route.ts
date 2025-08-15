import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface Ctx { params: { chatbotId: string } }

// ❗ Prisma sürümünden bağımsız enum tipi:
const MODES = ["STRICT", "FLEXIBLE"] as const;
type PromptMode = typeof MODES[number];
const isMode = (v: unknown): v is PromptMode => MODES.includes(v as PromptMode);

export async function GET(_req: Request, { params }: Ctx) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = session.user.id;
        const orgId  = session.user.organizationId;
        const { chatbotId } = params;

        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId, organizationId: orgId ?? undefined },
            select: { id: true, name: true, systemPrompt: true, mode: true, createdAt: true },
        });

        if (!bot) {
            return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });
        }

        return NextResponse.json(bot);
    } catch (err) {
        console.error("Chatbot GET hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: Ctx) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "İzin yok" }, { status: 403 });
        }

        const orgId  = session.user.organizationId;
        const { chatbotId } = params;
        const { name, systemPrompt, mode } = await req.json();

        // önce aynı org’a ait mi diye doğrula
        const existing = await prisma.chatbot.findFirst({
            where: { id: chatbotId, organizationId: orgId ?? undefined },
            select: { id: true },
        });
        if (!existing) {
            return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });
        }

        const updated = await prisma.chatbot.update({
            where: { id: chatbotId },
            data: {
                name: typeof name === "string" && name.trim() ? name.trim() : undefined,
                systemPrompt: typeof systemPrompt === "string" ? systemPrompt.trim() : undefined,
                mode: isMode(mode) ? mode : undefined, // sadece geçerliyse güncelle
            },
            select: { id: true, name: true, systemPrompt: true, mode: true },
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Chatbot PATCH hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: Ctx) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "İzin yok" }, { status: 403 });
        }

        const orgId = session.user.organizationId;
        const { chatbotId } = params;

        // aynı org’a mı ait?
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, organizationId: orgId ?? undefined },
            select: { id: true },
        });
        if (!bot) {
            return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });
        }

        // ilişkili conversation/document’lar için prisma şemasında onDelete: Cascade tanımlı olmalı
        await prisma.chatbot.delete({ where: { id: chatbotId } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Chatbot DELETE hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
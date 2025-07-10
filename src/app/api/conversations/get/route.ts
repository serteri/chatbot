import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return new NextResponse(JSON.stringify({ error: "Konuşma ID'si eksik" }), { status: 400 });
    }

    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                createdAt: true,
                messages: true,
            },
        });

        if (!conversation) {
            return new NextResponse(JSON.stringify({ error: "Konuşma bulunamadı" }), { status: 404 });
        }

        return NextResponse.json(conversation);
    } catch (err) {
        console.error("❌ Tekil konuşma alma hatası:", err);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), { status: 500 });
    }
}
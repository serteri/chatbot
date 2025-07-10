import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma"; // MongoDB yerine Prisma client'ı
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }
    const userId = session.user.id;

    try {
        // Prisma ile konuşmaları bulma (çok daha okunaklı!)
        const conversations = await prisma.conversation.findMany({
            where: {
                userId: userId, // Sadece bu kullanıcıya ait olanlar
            },
            orderBy: {
                createdAt: 'desc', // En yeniden eskiye sırala
            },
            select: { // Sadece gerekli alanları seçerek performansı artıralım
                id: true,
                title: true,
                createdAt: true,
            }
        });
        return NextResponse.json(conversations);
    } catch (error) {
        console.error("Konuşmaları çekerken hata:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucuda bir hata oluştu" }), { status: 500 });
    }
}

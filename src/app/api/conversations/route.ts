import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";



export async function GET(req: Request,) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }

    const userId = session.user.id;


    try {
        const conversation = await prisma.conversation.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, createdAt: true }
        });
        return NextResponse.json(conversation);

    } catch (error) {
        console.error("Konuşma detayı çekerken hata:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucuda bir hata oluştu" }), { status: 500 });
    }
}
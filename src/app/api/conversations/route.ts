import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";



export async function GET(req: Request,) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }

    const userId = session.user.id;
    const orgId  = session.user.organizationId;

    try {
        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId") || undefined;
        const conversation = await prisma.conversation.findMany({
            where: { userId,
                chatbotId,
                chatbot: { organizationId: orgId }},
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, createdAt: true }
        });
        return NextResponse.json(conversation);

    } catch (error) {
        console.error("Konuşma detayı çekerken hata:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucuda bir hata oluştu" }), { status: 500 });
    }
}
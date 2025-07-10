import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

interface RouteContext {
    params: {
        conversationId: string;
    }
}

export async function GET(req: Request, { params }: RouteContext) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }

    const userId = session.user.id;
    const { conversationId } = params;

    try {
        const conversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId,
                userId: userId, // Güvenlik: Kullanıcının sadece kendi konuşmasını çekebilmesini sağlar
            },
            // DEĞİŞİKLİK BURADA: Prisma'ya hangi alanları istediğimizi açıkça söylüyoruz.
            // Bu, 'messages' alanının kesinlikle dahil edilmesini garanti eder.
            select: {
                id: true,
                title: true,
                messages: true, // En önemli kısım
                createdAt: true,
            }
        });

        if (!conversation) {
            return new NextResponse(JSON.stringify({ error: "Konuşma bulunamadı" }), { status: 404 });
        }

        return NextResponse.json(conversation);

    } catch (error) {
        console.error("Konuşma detayı çekerken hata:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucuda bir hata oluştu" }), { status: 500 });
    }
}
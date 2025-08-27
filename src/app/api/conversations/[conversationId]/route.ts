import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getParamFromUrl } from "@/lib/routeParams";



export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }

    const userId = session.user.id;
    const conversationId = getParamFromUrl(req, "conversations");
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

export async function DELETE(_req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const isAdmin = session.user.role === "ADMIN";
    const userId  = session.user.id;
    const orgId   = session.user.organizationId;
    const conversationId = getParamFromUrl(_req, "conversations");

    try {
        const convo = await prisma.conversation.findFirst({
            where: { id: conversationId, chatbot: { organizationId: orgId } },
            select: { id: true, userId: true },
        });
        if (!convo) return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 });

        // Kural: ADMIN her zaman silebilir; USER ise sadece kendi konuşmasını silebilir (istersen bunu kapat)
        if (!isAdmin && convo.userId !== userId) {
            return NextResponse.json({ error: "İzin yok" }, { status: 403 });
        }

        await prisma.conversation.delete({ where: { id: conversationId } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Conversation DELETE hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
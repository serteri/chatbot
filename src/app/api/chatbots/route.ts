import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz" }), { status: 401 });
    }

    const userId = session.user.id;
    const orgId  = session.user.organizationId;
    try {
        // Gelen veriyi al
        const { name, systemPrompt } = await req.json();

        // Validasyon
        if (!name || name.trim().length < 2) {
            return new NextResponse(JSON.stringify({ error: "Geçerli bir isim girin" }), { status: 400 });
        }

        // Chatbot'u oluştur
        const newChatbot = await prisma.chatbot.create({
            data: {
                userId,
                organizationId: orgId,
                name: name.trim(),
                systemPrompt: systemPrompt?.trim() || "", // boş olabilir
            }
        });

        // Başarılı yanıt
        return new NextResponse(JSON.stringify(newChatbot), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Chatbot oluşturulurken hata:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz" }), { status: 401 });
    }

    const userId = session.user.id;
    const orgId  = session.user.organizationId;  // artık var

    try {
        const chatbots = await prisma.chatbot.findMany({
            where: { userId ,organizationId: orgId,},
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true },
        });

        return NextResponse.json(chatbots);
    } catch (error) {
        console.error("Chatbotları alırken hata:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), { status: 500 });
    }
}
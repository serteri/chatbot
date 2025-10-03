// src/app/api/chatbots/[chatbotId]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Belirli bir chatbot'u silmek için DELETE fonksiyonu
export async function DELETE(
    req: Request,
    { params }: { params: { chatbotId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }
    const userId = session.user.id;
    const { chatbotId } = params;

    if (!chatbotId) {
        return NextResponse.json({ error: "Chatbot ID gerekli." }, { status: 400 });
    }

    try {
        // İlk olarak, silinmek istenen chatbot'un bu kullanıcıya ait olduğunu doğrula.
        // Bu, başkasının chatbot'unu silmeyi engeller.
        const chatbot = await prisma.chatbot.findFirst({
            where: {
                id: chatbotId,
                userId: userId,
            },
        });

        if (!chatbot) {
            return NextResponse.json({ error: "Chatbot bulunamadı veya bu işlem için yetkiniz yok." }, { status: 404 });
        }

        // İki silme işlemini aynı anda ve güvenli bir şekilde yapmak için transaction kullanıyoruz.
        // Bu sayede ya ikisi de başarılı olur, ya da bir hata olursa ikisi de geri alınır.
        await prisma.$transaction([
            // 1. Önce bu chatbot'a ait tüm belgeleri sil.
            prisma.document.deleteMany({
                where: { chatbotId: chatbotId },
            }),
            // 2. Sonra chatbot'un kendisini sil.
            prisma.chatbot.delete({
                where: { id: chatbotId },
            }),
        ]);

        return NextResponse.json({ message: "Chatbot ve ilişkili belgeler başarıyla silindi." });

    } catch (error) {
        console.error("Chatbot silme hatası:", error);
        return NextResponse.json({ error: "Sunucuda bir hata oluştu." }, { status: 500 });
    }
}
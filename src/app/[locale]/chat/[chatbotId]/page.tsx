// src/app/chat/[chatbotId]/page.tsx (GÜVENLİK KONTROLÜ GÜNCELLENDİ)

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ChatPageClient from "../ChatPageClient";

export default async function ChatPage({ params }: { params: { chatbotId: string } }) {
    const session = await getServerSession(authOptions);
    // session.user'daki özel alanlara erişmek için tip ataması yapıyoruz
    const user = session?.user as any;
    console.log("--- SOHBET SAYFASI SUNUCU KONTROLÜ ---");
    console.log("URL'den gelen Chatbot ID:", params.chatbotId);
    console.log("Oturumdaki User ID:", user?.id);
    console.log("Oturumdaki Organization ID:", user?.organizationId);
    console.log("------------------------------------");
    if (!user) {
        console.log("!!! Oturum bulunamadı, 404 tetikleniyor.");
        notFound();
    }

    // GÜNCELLEME: Kontrole 'organizationId' de eklendi.
    // Bu, API ile sayfa yüklemesi arasındaki kontrolü tutarlı hale getirir.
    const chatbot = await prisma.chatbot.findFirst({
        where: {
            id: params.chatbotId,
            userId: user.id,
            organizationId: user.organizationId, // Bu kontrol eklendi
        }
    });

    if (!chatbot) {
        // Chatbot bulunamazsa veya kullanıcıya/organizasyonuna ait değilse 404 sayfası göster
        notFound();
    }

    // Client bileşenini render et ve chatbot bilgilerini prop olarak gönder
    return <ChatPageClient chatbot={chatbot} />;
}
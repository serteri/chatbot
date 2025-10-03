// src/app/api/chatbots/route.ts (HATA AYIKLAMA VERSİYONU)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    // --- YENİ EKLENEN HATA AYIKLAMA KODU ---
    console.log("--- YENİ CHATBOT OLUŞTURMA API KONTROLÜ ---");
    console.log("Alınan Session Nesnesi:", session);
    console.log("Session içindeki User Nesnesi:", user);
    console.log("Kullanılacak Organization ID:", user?.organizationId);
    console.log("-----------------------------------------");
    // --- BİTİŞ ---

    if (!user?.id || !user?.organizationId) {
        // Eğer bu hata mesajını alırsak, session'da organizationId'nin olmadığını anlarız.
        console.error("Hata: Oturumda user.id veya user.organizationId bulunamadı.");
        return NextResponse.json({ error: "Yetkisiz erişim veya eksik organizasyon bilgisi." }, { status: 401 });
    }
    const userId = user.id;
    const organizationId = user.organizationId;

    try {
        const body = await req.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "Chatbot adı gerekli." }, { status: 400 });
        }

        console.log(`Veritabanına kaydedilecek veriler: name=${name}, userId=${userId}, organizationId=${organizationId}`);

        const newChatbot = await prisma.chatbot.create({
            data: {
                userId,
                organizationId, // Chatbot'u oluştururken organizasyon ID'sini de kaydediyoruz
                name,
            },
        });

        console.log("Yeni chatbot başarıyla oluşturuldu:", newChatbot);

        return NextResponse.json(newChatbot, { status: 201 });
    } catch (error) {
        console.error("!!! Chatbot oluşturma hatası:", error);
        return NextResponse.json({ error: "Sunucuda bir hata oluştu." }, { status: 500 });
    }
}
// src/app/api/contact/route.ts

import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, company, email, message } = body;

        // Gerekli alanların kontrolü
        if (!name || !email || !message) {
            return NextResponse.json({ error: "Lütfen gerekli tüm alanları doldurun." }, { status: 400 });
        }

        // --- BURADA E-POSTA GÖNDERME İŞLEMİ YAPILIR ---
        // Bu aşamada, bu bilgileri kendi e-posta adresinize göndermek için
        // Nodemailer, Resend, SendGrid gibi bir servis kullanmanız gerekir.
        // Şimdilik, verilerin sunucuya ulaştığını görmek için console'a yazdırıyoruz.

        console.log("--- YENİ İLETİŞİM FORMU MESAJI ---");
        console.log("Ad Soyad:", name);
        console.log("Şirket:", company);
        console.log("E-posta:", email);
        console.log("Mesaj:", message);
        console.log("---------------------------------");

        return NextResponse.json({ success: true, message: "Mesaj başarıyla alındı." });

    } catch (error) {
        console.error("İletişim formu API hatası:", error);
        return NextResponse.json({ error: "Sunucuda bir hata oluştu." }, { status: 500 });
    }
}
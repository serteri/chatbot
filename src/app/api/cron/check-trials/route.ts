// src/app/api/cron/check-trials/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
// import { Resend } from 'resend'; // E-posta göndermek için Resend gibi bir kütüphane

// const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    // Cron job'un Vercel dışından çalıştırılmasını engellemek için güvenlik anahtarı
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // Bitiş tarihi 3 gün sonrası olan kullanıcıları bul
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const usersToRemind = await prisma.user.findMany({
            where: {
                trialEndsAt: {
                    // Tam olarak 3 gün sonrasına denk gelenleri bul
                    gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
                    lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999)),
                },
                plan: 'PRO',
            },
        });

        // Bulunan her kullanıcıya e-posta gönder
        for (const user of usersToRemind) {
            if (user.email) {
                console.log(`Sending trial reminder to: ${user.email}`);
                /*
                // GERÇEK E-POSTA GÖNDERME KODU (Resend örneği)
                await resend.emails.send({
                    from: 'Siteniz <noreply@yourdomain.com>',
                    to: [user.email],
                    subject: 'ChatProjesi Deneme Süreniz Bitiyor!',
                    html: `
                        <h1>Merhaba ${user.name || ''},</h1>
                        <p>ChatProjesi'ndeki 14 günlük deneme sürenizin bitmesine sadece 3 gün kaldı.</p>
                        <p>Aboneliğinizi başlatmak ve projelerinize devam etmek için lütfen panelinizi ziyaret edin.</p>
                    `
                });
                */
            }
        }

        return NextResponse.json({ success: true, reminded: usersToRemind.length });
    } catch (error) {
        console.error("Cron job error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
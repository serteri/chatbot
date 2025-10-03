// src/app/api/cron/downgrade-trials/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    // Cron job'un Vercel dışından çalıştırılmasını engellemek için güvenlik anahtarı
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const now = new Date();

        // Deneme süresi bitmiş VE hala PRO planında olan kullanıcıları bul.
        // Gelecekte bir ödeme sistemi eklediğinizde, aktif bir aboneliği olmayanları
        // da kontrol etmek için `stripeSubscriptionId: null` gibi bir koşul ekleyebilirsiniz.
        const expiredUsers = await prisma.user.findMany({
            where: {
                plan: 'PRO',
                trialEndsAt: {
                    lt: now // Bitiş tarihi şu andan daha eski olanlar
                },
                // Gelecekte eklenecek: stripeSubscriptionId: null
            },
            select: {
                id: true
            }
        });

        if (expiredUsers.length === 0) {
            return NextResponse.json({ success: true, message: "Planı düşürülecek kullanıcı bulunamadı." });
        }

        const userIdsToDowngrade = expiredUsers.map(user => user.id);

        // Bulunan tüm kullanıcıların planını tek bir komutla 'FREE' olarak güncelle
        const result = await prisma.user.updateMany({
            where: {
                id: {
                    in: userIdsToDowngrade,
                },
            },
            data: {
                plan: 'FREE',
            },
        });

        console.log(`${result.count} kullanıcının planı PRO denemesinden FREE'ye düşürüldü.`);

        return NextResponse.json({ success: true, downgraded: result.count });

    } catch (error) {
        console.error("Plan düşürme cron job hatası:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
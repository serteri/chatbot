// src/app/api/chatbots/[chatbotId]/conversations/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: { chatbotId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    try {
        const conversations = await prisma.conversation.findMany({
            where: {
                chatbotId: params.chatbotId,
                userId: session.user.id, // Sadece kendi konuşmalarını görebilsin
            },
            select: {
                id: true,
                title: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return NextResponse.json(conversations);
    } catch (error) {
        console.error("Konuşma listeleme hatası:", error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
// src/app/api/documents/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/documents?chatbotId=...
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    // UI'ın kolaylığı için yetkisiz/eksik parametre durumunda 200 + [] dönüyoruz
    if (!session?.user?.id) return NextResponse.json([]);
    const { searchParams } = new URL(req.url);
    const chatbotId = (searchParams.get("chatbotId") || "").trim();
    if (!chatbotId) return NextResponse.json([]);

    const userId = session.user.id;

    // fileName’e göre gruplayıp parça sayısını getir
    const rows = await prisma.document.groupBy({
        by: ["fileName"],
        where: { chatbotId, userId },
        _count: { fileName: true },
    });

    const shaped = rows.map(r => ({
        fileName: r.fileName ?? "(isimsiz)",
        count: r._count.fileName,
    }));

    return NextResponse.json(shaped);
}

// DELETE /api/documents?chatbotId=...&fileName=...
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Yetkisiz", { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatbotId = (searchParams.get("chatbotId") || "").trim();
    const fileName = (searchParams.get("fileName") || "").trim();
    if (!chatbotId || !fileName) {
        return new NextResponse("chatbotId ve fileName gerekli", { status: 400 });
    }

    const userId = session.user.id;
    const deleted = await prisma.document.deleteMany({
        where: { userId, chatbotId, fileName },
    });

    return NextResponse.json({ deleted: deleted.count });
}

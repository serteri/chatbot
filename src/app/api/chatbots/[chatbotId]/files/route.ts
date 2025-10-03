import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { chatbotId: string } };

export async function GET(_req: Request, { params }: RouteContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        // UI basit kalsın diye 200 + boş dönüyoruz
        return NextResponse.json({ items: [] });
    }

    const chatbotId = params.chatbotId;
    const userId = session.user.id;

    // fileName’e göre grupla, adet + son tarih
    const rows = await prisma.document.groupBy({
        by: ["fileName"],
        where: { chatbotId, userId },
        _count: { _all: true },
        _max: { createdAt: true, updatedAt: true },
    });

    const items = rows.map((r) => ({
        fileName: r.fileName ?? "(isimsiz)",
        docCount: r._count._all,
        lastUpdatedAt: (r._max.createdAt ?? r._max.updatedAt) ?? null,
    }));

    return NextResponse.json({ items });
}

export async function DELETE(req: Request, { params }: RouteContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse("Yetkisiz", { status: 401 });
    }

    const chatbotId = params.chatbotId;
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");

    if (!fileName) {
        return new NextResponse("fileName gerekli", { status: 400 });
    }

    const deleted = await prisma.document.deleteMany({
        where: { chatbotId, userId, fileName },
    });

    return NextResponse.json({ deleted: deleted.count });
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const rows = await prisma.conversation.findMany({
        where: { userId: session.user.id },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    return Response.json(rows);
}
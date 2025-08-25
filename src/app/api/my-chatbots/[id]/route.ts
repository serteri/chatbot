import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const bot = await prisma.chatbot.findFirst({
        where: { id: params.id, userId: session.user.id },
        select: { id: true, name: true, mode: true, systemPrompt: true, embedAllowlist: true, isPublic: true },
    });
    if (!bot) return new Response("Bulunamadı", { status: 404 });
    return Response.json(bot);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { mode, systemPrompt, embedAllowlist, isPublic } = body;

    const updated = await prisma.chatbot.update({
        where: { id: params.id, userId: session.user.id },
        data: {
            mode, systemPrompt,
            isPublic: Boolean(isPublic),
            embedAllowlist: Array.isArray(embedAllowlist)
                ? embedAllowlist.map((s: string) => s.trim()).filter(Boolean)
                : undefined,
        },
        select: { id: true },
    });

    return Response.json({ ok: true, id: updated.id });
}

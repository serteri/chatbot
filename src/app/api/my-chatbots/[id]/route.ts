import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getParamFromUrl } from "@/lib/routeParams";

export const runtime = "nodejs";

export async function GET(_req: Request,) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const id = getParamFromUrl(_req, "my-chatbots");
    if (!id) return new Response("id yok", { status: 400 });

    const bot = await prisma.chatbot.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true, name: true, mode: true, systemPrompt: true, embedAllowlist: true, isPublic: true },
    });
    if (!bot) return new Response("Bulunamadı", { status: 404 });
    return Response.json(bot);
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const id = getParamFromUrl(req, "my-chatbots");
    if (!id) return new Response("id yok", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { mode, systemPrompt, embedAllowlist, isPublic } = body;

// sahiplik kontrolü
    const owned = await prisma.chatbot.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true },
    });
    if (!owned) return new Response("Bulunamadı", { status: 404 });

    const updated = await prisma.chatbot.update({
        where: { id, userId: session.user.id },
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

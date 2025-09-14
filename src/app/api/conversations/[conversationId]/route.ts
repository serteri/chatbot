import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getParamFromUrl } from "@/lib/routeParams";

export const runtime = "nodejs";

// GET /api/conversations/:conversationId
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz erişim", { status: 401 });

    const conversationId = getParamFromUrl(req, "conversations");
    if (!conversationId) return new Response("conversationId yok", { status: 400 });

    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id },
        select: { id: true, title: true, messages: true, createdAt: true },
    });

    if (!conversation) return new Response("Konuşma bulunamadı", { status: 404 });
    return Response.json(conversation);
}

// DELETE /api/conversations/:conversationId
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const conversationId = getParamFromUrl(req, "conversations");
    if (!conversationId) return new Response("conversationId yok", { status: 400 });

    const isAdmin = session.user.role === "ADMIN";
    const userId = session.user.id;
    const orgId = session.user.organizationId;

    const convo = await prisma.conversation.findFirst({
        where: { id: conversationId, chatbot: { organizationId: orgId } },
        select: { id: true, userId: true },
    });
    if (!convo) return new Response("Konuşma bulunamadı", { status: 404 });
    if (!isAdmin && convo.userId !== userId) return new Response("İzin yok", { status: 403 });

    await prisma.conversation.delete({ where: { id: conversationId } });
    return Response.json({ success: true });
}

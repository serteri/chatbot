import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getParamFromUrl } from "@/lib/routeParams";


export const runtime = "nodejs";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }
    const userId = session.user.id;
    const orgId  = session.user.organizationId;
    const chatbotId = getParamFromUrl(req, "chatbots");
    if (!chatbotId) return new Response("chatbotId yok", { status: 400 })

    try {
        const chatbot = await prisma.chatbot.findUnique({
            where: {
                id: chatbotId, userId, organizationId: orgId
            },
            select: { id: true },
        });

        if (!chatbot) {
            return new NextResponse(JSON.stringify({ error: "Chatbot bulunamadı" }), { status: 404 });
        }

        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL?.trim() ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

        const iframeCode = `<iframe src="${baseUrl}/embed/${chatbotId}" width="100%" height="600" style="border:none;"></iframe>`;

        return NextResponse.json({ embedCode: iframeCode });

    } catch (err) {
        console.error("Embed kodu oluşturulamadı:", err);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), { status: 500 });
    }
}
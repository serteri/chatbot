import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const chatbotId = req.nextUrl.searchParams.get("chatbotId");
    if (!chatbotId) return new Response("chatbotId zorunlu", { status: 400 });

    const referer = req.headers.get("referer") || "";
    let host = "";
    try { host = new URL(referer).hostname; } catch {}

    const bot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
        select: { embedAllowlist: true },
    });

    const ok = !!host && !!bot?.embedAllowlist?.includes(host);
    return new Response(ok ? "ok" : "forbidden", { status: ok ? 200 : 403 });
}
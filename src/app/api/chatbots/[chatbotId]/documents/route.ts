import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getParamFromUrl } from "@/lib/routeParams";


export const runtime = "nodejs";

// GET /api/chatbots/:chatbotId/documents
// Optional query: ?fileName=...&limit=...
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }

    const userId = session.user.id;
    const chatbotId = getParamFromUrl(req, "chatbots");

    const url = new URL(req.url);
    const fileName = url.searchParams.get("fileName");
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? Math.max(1, Math.min(50, Number(limitStr))) : undefined;

    try {
        if (fileName) {
            // Belirli bir dosyanın CHUNK’larını sırayla getir (önizleme veya detay sayfası için)
            const docs = await prisma.document.findMany({
                where: { userId, chatbotId,  ...(fileName ? { fileName } : {}), },
                orderBy: [ { fileName: "asc" },
                    { chunkIndex: "asc" },
                    { createdAt: "desc" },],
                select: { id: true, content: true, createdAt: true, chunkIndex: true, chunkCount: true,fileName:true },
                take: limit,
            });
            return NextResponse.json(docs);
        }


    } catch (error) {
        console.error("Belge listesi hatası:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucu hatası" }), { status: 500 });
    }
}

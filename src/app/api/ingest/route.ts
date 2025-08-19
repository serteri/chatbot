import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const embedder = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const { text, fileName, mimeType, chatbotId } = await req.json();

        if (!text || !text?.trim()) {
            return NextResponse.json({ error: "Gelen metin boş." }, { status: 400 });
        }
        if (!chatbotId) {
            return NextResponse.json({ error: "Chatbot ID eksik." }, { status: 400 });
        }

        // sahibini doğrula (opsiyonel ama iyi)
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId },
            select: { id: true },
        });
        if (!bot) {
            return NextResponse.json({ error: "Bu bota erişim yok" }, { status: 403 });
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 200,
        });
        const chunks = await splitter.splitText(text);

        const total = chunks.length;
        let created = 0;
        // parça parça ekle
        for (let i = 0; i < chunks.length; i++) {
            const content = chunks[i];
            const vec: number[] = await embedder.embedQuery(content);
            const lit = `[${vec.join(",")}]`; // vector literal
            // önce create (content)
           const doc =  await prisma.document.create({
                data: {
                    userId,
                    chatbotId,
                    content,
                    fileName: fileName || null,
                    mimeType: mimeType || null,
                    chunkIndex: i,
                    chunkCount: total,       // 👈 toplam parça
                },
                select: { id: true },
            });
            // 2) sonra embeddingVec’i raw SQL ile set et
            // Not: vektör literali inline gidiyor. id paramı zaten cuid.
            await prisma.$executeRawUnsafe(
                `UPDATE "Document" SET "embeddingVec" = ${lit}::vector WHERE "id" = '${doc.id}'`
            );

            created++;
        }


        return NextResponse.json({
            success: true,
            message: `'${fileName || "metin"}' ${created} parça işlendi.`,
            count: created,
        });
    } catch (error) {
        console.error("Ingest API hatası:", error);
        return NextResponse.json(
            { error: "Veri işlenirken bir hata oluştu." },
            { status: 500 }
        );
    }
}

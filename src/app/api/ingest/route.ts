import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const embeddings = new OpenAIEmbeddings({
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

        if (!text?.trim()) {
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

        // parça parça ekle
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // önce create (content)
            const created = await prisma.document.create({
                data: {
                    userId,
                    chatbotId,
                    content: chunk,
                    fileName: fileName ?? null,
                    mimeType: mimeType ?? null,
                    chunkIndex: i,
                    chunkCount: total,
                },
                select: { id: true },
            });

            // sonra embedding (ve varsa pgvector) doldur
            const emb = await embeddings.embedQuery(chunk);
            const lit = `[${emb.join(",")}]`;

            await prisma.$executeRaw`
        UPDATE "Document"
        SET "embeddingVec" = ${lit}::vector
        WHERE "id" = ${created.id}
      `;

            // istersen Float[] alanını da doldur:
            // await prisma.document.update({
            //   where: { id: created.id },
            //   data: { embedding: emb },
            // });
        }

        return NextResponse.json({
            success: true,
            message: `'${fileName ?? "metin"}' ${total} parça olarak işlendi.`,
        });
    } catch (error) {
        console.error("Ingest API hatası:", error);
        return NextResponse.json(
            { error: "Veri işlenirken bir hata oluştu." },
            { status: 500 }
        );
    }
}

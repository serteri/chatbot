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
    if (!session || !session.user?.id) {
        return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), { status: 401 });
    }
    const userId = session.user.id;

    try {
        const { text, fileName, chatbotId } = await req.json();

        if (!text || !text.trim()) {
            return new NextResponse(JSON.stringify({ error: "Gelen metin boş." }), { status: 400 });
        }
        if (!chatbotId) {
            return new NextResponse(JSON.stringify({ error: "Chatbot ID eksik." }), { status: 400 });
        }

        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 200 });
        const chunks = await splitter.splitText(text);

        for (const chunk of chunks) {
            const embedding = await embeddings.embedQuery(chunk);
            await prisma.document.create({
                data: {
                    userId,
                    chatbotId, // 👈 her belgeye bu chatbot'a ait olduğunu yazıyoruz
                    content: chunk,
                    embedding,
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `'${fileName}' dosyasından ${chunks.length} parça başarıyla işlendi.`,
        });

    } catch (error) {
        console.error("Ingestion API hatası:", error);
        return new NextResponse(JSON.stringify({ error: "Veri işlenirken bir hata oluştu." }), { status: 500 });
    }
}
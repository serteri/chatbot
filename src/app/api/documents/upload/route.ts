// src/app/api/documents/upload/route.ts (DÜZELTİLMİŞ HALİ)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

// ... (extractTextFromFile fonksiyonu aynı kalıyor) ...

async function extractTextFromFile(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
        const data = await pdf(buffer);
        return data.text;
    }
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith('.docx')) {
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
    }
    return buffer.toString("utf8");
}


export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const chatbotId = formData.get("chatbotId") as string | null;

        if (!file || !chatbotId) {
            return NextResponse.json({ error: "Eksik bilgi: Dosya veya chatbotId eksik." }, { status: 400 });
        }

        // --- YENİ EKLENEN KONTROL ---
        // Bu chatbotId'nin veritabanında var olup olmadığını ve kullanıcıya ait olup olmadığını kontrol et.
        const bot = await prisma.chatbot.findFirst({
            where: {
                id: chatbotId,
                userId: userId,
            },
        });

        if (!bot) {
            return NextResponse.json({ error: "Bu chatbot'a erişim yetkiniz yok veya chatbot bulunamadı." }, { status: 403 });
        }
        // --- KONTROL BİTİŞİ ---

        const text = await extractTextFromFile(file);

        if (!text.trim()) {
            return NextResponse.json({ error: "Dosyadan metin çıkarılamadı." }, { status: 422 });
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 200,
        });
        const chunks = await splitter.splitText(text);

        const documentsToCreate = chunks.map((chunk, index) => ({
            userId,
            chatbotId, // Artık bu ID'nin geçerli olduğundan eminiz
            content: chunk,
            fileName: file.name,
            chunkIndex: index,
            chunkCount: chunks.length,
        }));

        await prisma.document.createMany({
            data: documentsToCreate,
        });

        return NextResponse.json({ message: `'${file.name}' dosyasından ${chunks.length} parça başarıyla işlendi.` });

    } catch (error: any) {
        console.error("Dosya yükleme hatası:", error);
        // Prisma'nın P2003 hatasını yakalayıp daha anlaşılır bir mesaj verelim
        if (error.code === 'P2003') {
            return NextResponse.json({ error: "Geçersiz chatbotId nedeniyle referans hatası." }, { status: 400 });
        }
        return NextResponse.json({ error: "Sunucuda bir hata oluştu: " + error.message }, { status: 500 });
    }
}
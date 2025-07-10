import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
const ALLOWED_MIME_TYPES = ["text/plain", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
    // 1. OTURUM KONTROLÜ
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Yetkisiz. Lütfen giriş yapın." }, { status: 401 });
    }

    // 2. FORM VERİSİ OKU
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const chatbotId = formData.get("chatbotId");

    if (!file) {
        return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });

    }// YENİ: Boyut limiti
    if ((file as any).size && (file as any).size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Dosya boyutu en fazla 10 MB olabilir." }, { status: 400 });
    }

    // YENİ: MIME kontrolü
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Sadece .txt ve .pdf dosyalar destekleniyor." }, { status: 400 });
    }


    // 3. DOSYA BOYUTU ve TİPİ KONTROLÜ
    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Sadece .pdf ve .txt dosyalar yüklenebilir." }, { status: 400 });
    }

   

    // 4. DOSYA YOLU & KAYDETME
    const ext = path.extname(file.name) || ".bin";
    const fileName = `${randomUUID()}${ext}`;
    const uploadPath = path.join(process.cwd(), "public", "uploads", fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(uploadPath, Buffer.from(bytes));

    // 5. (GEREKİRSE) YÜKLEYENİ ve CHATBOT'u VERİTABANINDA LOG’LA
    // await prisma.uploadedFile.create({ data: { userId: session.user.id, chatbotId, fileName, path: uploadPath } });

    // 6. URL DÖN
    const url = `/uploads/${fileName}`;
    return NextResponse.json({ url });
}
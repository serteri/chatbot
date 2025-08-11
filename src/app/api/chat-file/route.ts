import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
const ALLOWED_MIME_TYPES = ["text/plain", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
    // 1. OTURUM KONTROLÜ
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Yetkisiz. Lütfen giriş yapın." }, { status: 401 });
    }
    const userId = session.user.id;
    const orgId  = session.user.organizationId;

    try{
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const chatbotId = formData.get("chatbotId") as string | null;

        if (!file)      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
        if (!chatbotId) return NextResponse.json({ error: "Chatbot ID gerekli" }, { status: 400 });

        if ((file as any).size && (file as any).size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Dosya boyutu en fazla 10 MB olabilir." }, { status: 400 });
        }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Sadece .txt ve .pdf dosyalar destekleniyor." }, { status: 400 });
        }

        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId, organizationId: orgId },
            select: { id: true },
        });
        if (!bot) return NextResponse.json({ error: "Bu bota erişim yok." }, { status: 403 });

        const ext = path.extname(file.name) || ".bin";
        const fileName = `${randomUUID()}${ext}`;
        const uploadPath = path.join(process.cwd(), "public", "uploads", fileName);

        const bytes = await file.arrayBuffer();
        await writeFile(uploadPath, Buffer.from(bytes));

        const url = `/uploads/${fileName}`;
        return NextResponse.json({ url });
    } catch (err) {
        console.error("Dosya yükleme hatası:", err);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
    }

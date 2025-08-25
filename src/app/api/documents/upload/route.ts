import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import pdfParse from "pdf-parse";
import { OpenAIEmbeddings } from "@langchain/openai";
import { chunkText } from "@/lib/chunk";
import pLimit from "p-limit";

export const runtime = "nodejs";

const MAX_FILE_MB = 20;
const allowMime = new Set(["application/pdf", "text/plain", "text/markdown"]);

async function fileToText(file: File): Promise<{ text: string; fileName: string }> {
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    const fileName = file.name || "upload";

    if (file.type === "application/pdf" || /\.pdf$/i.test(fileName)) {
        const pdf = await pdfParse(buf);
        return { text: (pdf.text || "").trim(), fileName };
    }
    // txt / md
    return { text: buf.toString("utf8"), fileName };
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    try {
        const form = await req.formData();
        const chatbotId = String(form.get("chatbotId") || "");
        if (!chatbotId) return new Response("chatbotId gerekli", { status: 400 });

        // Bot sahipliği kontrolü
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId: session.user.id, organizationId: session.user.organizationId || undefined },
            select: { id: true, userId: true },
        });
        if (!bot) return new Response("Erişim yok (bot)", { status: 403 });

        const files = form.getAll("files").filter(Boolean) as File[];
        if (!files.length) return new Response("Dosya yok", { status: 400 });

        // boyut ve mime kontrol
        for (const f of files) {
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
                return new Response(`Dosya çok büyük: ${f.name}`, { status: 400 });
            }
            if (!allowMime.has(f.type) && !/\.(pdf|txt|md)$/i.test(f.name)) {
                return new Response(`Desteklenmeyen tür: ${f.name}`, { status: 400 });
            }
        }

        const embedder = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY!,
            model: "text-embedding-3-small",
        });

        const limiter = pLimit(3); // aynı anda 3 embedding
        let totalChunks = 0;

        await prisma.$transaction(async (tx) => {
            for (const file of files) {
                const { text, fileName } = await fileToText(file);
                const chunks = chunkText(text);
                if (!chunks.length) continue;

                // Parçaları tek tek kaydet → embeddingVec’i doldur
                // (Prisma vector tipini "Unsupported" görür, bu yüzden $executeRaw ile cast ediyoruz)
                for (const chunk of chunks) {
                    // 1) satırı oluştur
                    const doc = await tx.document.create({
                        data: {
                            userId: session.user.id,
                            chatbotId,
                            content: chunk,
                            fileName,
                        },
                        select: { id: true },
                    });

                    // 2) embedding al
                    const emb = await limiter(() => embedder.embedQuery(chunk));

                    // 3) vector alanını doldur
                    await tx.$executeRawUnsafe(
                        `UPDATE "Document" SET "embeddingVec" = $1::vector WHERE "id" = $2`,
                        emb,
                        doc.id
                    );
                    totalChunks++;
                }
            }
        });

        return Response.json({ ok: true, chunks: totalChunks });
    } catch (e) {
        console.error("upload error:", e);
        return new Response("Sunucu hatası", { status: 500 });
    }
}

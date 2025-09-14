import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { chunkText } from "@/lib/chunk";
import pLimit from "p-limit";

export const runtime = "nodejs";

const MAX_FILE_MB = 20;
const allowMime = new Set(["application/pdf", "text/plain", "text/markdown"]);

const OCR_LANGS = process.env.TESSERACT_LANGS || "eng+tur";
const OCR_SCALE = Number(process.env.OCR_SCALE || 2.0);

// --- pdfjs ile metin çıkar ---
async function extractPdfTextPdfjs(buf: Buffer): Promise<string> {
    // 🔧 ÖNEMLİ: .js uzantısı ile import et
    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.js");

    const loadingTask = pdfjsLib.getDocument({
        data: buf,
        disableWorker: true,
        useWorkerFetch: false,
        isEvalSupported: true,
        disableFontFace: true,
        disableCreateObjectURL: true,
    });
    const pdf = await loadingTask.promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false,
            includeMarkedContent: true,
        });
        const pageText = (textContent.items as any[])
            .map((it) => (typeof it?.str === "string" ? it.str : ""))
            .join(" ")
            .replace(/\s+\n/g, "\n")
            .trim();
        if (pageText) pages.push(pageText);
    }
    return pages.join("\n\n").trim();
}

// --- pdfjs metin çıkaramazsa OCR fallback ---
async function ocrPdfToText(buf: Buffer, langs = OCR_LANGS): Promise<string> {
    // pdf’ü yine pdfjs ile render edeceğiz → .js uzantısı şart
    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.js");

    const { createCanvas } = await import("@napi-rs/canvas");
    const { createWorker } = await import("tesseract.js");

    const task = pdfjsLib.getDocument({ data: buf, disableWorker: true });
    const pdf = await task.promise;

    const worker = await createWorker(langs, 1);
    const out: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: OCR_SCALE });

        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const ctx = canvas.getContext("2d") as any;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Buffer → OCR
        const png = canvas.toBuffer("image/png");
        const { data } = await worker.recognize(png);
        const text = (data?.text || "").trim();
        if (text) out.push(text);
    }

    await worker.terminate();
    return out.join("\n\n").trim();
}

async function fileToText(file: File): Promise<{ text: string; fileName: string }> {
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    const fileName = file.name || "upload";

    if (file.type === "application/pdf" || /\.pdf$/i.test(fileName)) {
        let text = "";
        try {
            text = await extractPdfTextPdfjs(buf);
            if (text?.trim()) return { text, fileName };
            console.warn(`[upload] pdfjs metin boş → OCR’a geçilecek: ${fileName}`);
        } catch (e) {
            console.warn(`[upload] pdfjs hata → OCR’a geçilecek (${fileName}):`, e);
        }

        try {
            text = await ocrPdfToText(buf);
        } catch (e) {
            console.error(`[upload] OCR hata (${fileName}):`, e);
            text = "";
        }
        return { text, fileName };
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

        // Bot sahipliği
        const bot = await prisma.chatbot.findFirst({
            where: {
                id: chatbotId,
                userId: session.user.id,
                organizationId: session.user.organizationId || undefined,
            },
            select: { id: true },
        });
        if (!bot) return new Response("Erişim yok (bot)", { status: 403 });

        const files = form.getAll("files").filter(Boolean) as File[];
        if (!files.length) return new Response("Dosya yok", { status: 400 });

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

        const limiter = pLimit(3);
        let totalChunks = 0;

        type Pending = { id: string; chunk: string };
        const pending: Pending[] = [];

        await prisma.$transaction(async (tx) => {
            for (const file of files) {
                const { text, fileName } = await fileToText(file);

                if (!text?.trim()) {
                    throw new Error(
                        `Metin çıkarılamadı: ${fileName}. PDF tarama olabilir veya OCR başarısız. ` +
                        `Lütfen metin seçilebilir PDF ya da .txt/.md deneyin.`
                    );
                }

                const chunks = chunkText(text);
                if (!chunks.length) continue;

                for (const chunk of chunks) {
                    const doc = await tx.document.create({
                        data: { userId: session.user.id, chatbotId, content: chunk, fileName },
                        select: { id: true },
                    });
                    pending.push({ id: doc.id, chunk });
                    totalChunks++;
                }
            }
        });

        await Promise.all(
            pending.map(({ id, chunk }) =>
                limiter(async () => {
                    try {
                        const emb = await embedder.embedQuery(chunk);
                        await prisma.$executeRawUnsafe(
                            `UPDATE "Document" SET "embeddingVec" = $1::vector WHERE "id" = $2`,
                            emb,
                            id
                        );
                    } catch (err) {
                        console.error("embedding/update error for doc", id, err);
                    }
                })
            )
        );

        return Response.json({ ok: true, chunks: totalChunks });
    } catch (e: any) {
        const msg = typeof e?.message === "string" ? e.message : "Sunucu hatası";
        const status = msg.startsWith("Metin çıkarılamadı") ? 422 : 500;
        console.error("upload error:", e);
        return new Response(msg, { status });
    }
}

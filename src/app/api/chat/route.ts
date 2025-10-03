// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
});

type Row = { content: string; distance: number };

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const userId = session.user.id;
    const orgId = (session.user as any).organizationId ?? null;

    try {
        const { messages, conversationId, chatbotId } = await req.json();

        // Basit validasyon
        if (!chatbotId || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
        }

        // Bot sahipliği
        const bot = await prisma.chatbot.findFirst({
            where: {
                id: chatbotId,
                userId,
                ...(orgId ? { organizationId: orgId } : {}),
            },
            select: { id: true, systemPrompt: true, mode: true },
        });
        if (!bot) {
            return NextResponse.json({ error: "Bu bota erişim yok" }, { status: 403 });
        }

        // Son kullanıcı mesajı
        const last = messages[messages.length - 1] as { role?: string; content: string };
        const userMessage = last?.content ?? "";
        if (!userMessage.trim()) {
            return NextResponse.json({ error: "Mesaj boş" }, { status: 400 });
        }

        // --- Vektör arama (pgvector) ---
        const limit = 5;
        const vector = await embeddings.embedQuery(userMessage); // <-- TANIMLANDI
        const vecSql = Prisma.raw(`[${vector.join(",")}]`);

        const rows = (await prisma.$queryRaw(
            Prisma.sql`
        SELECT "content",
               1 - ("embeddingVec" <=> ${vecSql}::vector) AS distance
        FROM "Document"
        WHERE "chatbotId" = ${chatbotId} AND "userId" = ${userId}
        ORDER BY "embeddingVec" <=> ${vecSql}::vector
        LIMIT ${limit}
      `
        )) as Row[];

        // En iyi bağlam(lar)
        const topK = rows.map(r => r.content).filter(Boolean);
        const finalContext = topK.slice(0, 4).join("\n\n---\n\n"); // istersen tekini de alabilirsin: rows[0]?.content ?? ""

        const isStrict = bot.mode === "STRICT";

        // Konuşmayı kaydedip cevap dönen küçük yardımcı
        let currentConversationId: string | undefined = conversationId;
        const persistAndRespond = async (aiText: string) => {
            if (currentConversationId) {
                await prisma.conversation.update({
                    where: { id: currentConversationId, userId },
                    data: {
                        messages: {
                            // JSON[]/JSONB[] alanı için push; gerekirse şemanıza göre ayarlayın
                            push: [
                                { role: "user", content: userMessage },
                                { role: "assistant", content: aiText },
                            ] as any,
                        },
                    },
                });
            } else {
                const created = await prisma.conversation.create({
                    data: {
                        title: userMessage.substring(0, 50),
                        chatbot: { connect: { id: chatbotId } },
                        messages: [
                            { role: "user", content: userMessage },
                            { role: "assistant", content: aiText },
                        ] as any,
                        user: { connect: { id: userId } },
                    },
                    select: { id: true },
                });
                currentConversationId = created.id;
            }
            return NextResponse.json({
                text: aiText, // <-- aiResponseText yerine parametreyi kullan
                conversationId: currentConversationId,
            });
        };

        if (isStrict && !finalContext) {
            return await persistAndRespond("Üzgünüm, bu bilgi yüklediğiniz belgelerde bulunmuyor.");
        }

        const systemPrompt = `
${bot.systemPrompt ?? "Yardımsever ve net yanıt ver."}

Kurallar:
${isStrict ? "- SADECE aşağıdaki kaynaklardan yanıt ver." : "- Önce kaynakları kullan, gerekirse genel bilgini ekle."}

KAYNAKLAR:
---
${finalContext || "Yok"}
---
`.trim();

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
        });

        const aiResponseText = completion.choices[0]?.message?.content ?? "Bir sorun oluştu.";
        return await persistAndRespond(aiResponseText);
    } catch (err) {
        console.error("Chat API hatası:", err);
        return NextResponse.json({ error: "Sunucuda bir hata oluştu" }, { status: 500 });
    }
}

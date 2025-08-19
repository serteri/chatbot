import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
});

// type Row = { content: string };

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const userId = session.user.id;
    const orgId = session.user.organizationId ?? null;

    try {
        const { messages, conversationId, chatbotId } = await req.json();

        if (!messages?.length) {
            return new Response(JSON.stringify({ error: "Mesaj yok" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        // güvenlik: zorunlu alanlar
        if (!chatbotId || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
        }

        // bu chatbot gerçekten bu kullanıcıya (ve/veya organizasyona) ait mi?
        const bot = await prisma.chatbot.findFirst({
            where: {
                id: chatbotId,
                userId,
                ...(orgId ? { organizationId: orgId } : {}),
            },
            select: { id: true, systemPrompt: true, mode: true },
        });

        if (!bot) {
            return NextResponse.json({ error: "Bu bota erişim yok" }, { status: 403 ,headers: { "Content-Type": "application/json" }},);
        }

        const userMessage = messages[messages.length - 1] as { content: string };
        const queryEmbedding = await embeddings.embedQuery(userMessage.content);
        const lit = `[${queryEmbedding.join(",")}]`;

        // 🔎 PGVECTOR TOP-K (JS cosine çöp oldu)
        const rows = await prisma.$queryRawUnsafe<
            { content: string; distance: number }[]
        >(
            `
      SELECT "content", ("embeddingVec" <=> ${lit}::vector) AS distance
      FROM "Document"
      WHERE "userId" = '${userId}' AND "chatbotId" = '${chatbotId}'
      ORDER BY "embeddingVec" <=> ${lit}::vector ASC
      LIMIT 5
    `
        );

        // en iyi bağlamı seç (istersen ilkini al; gerekirse mini rerank kullanabilirsin)
        const finalContext = rows.length ? rows[0].content : "";

        const isStrict = bot.mode === "STRICT";

        // Kısa yardımcı: konuşmayı DB’ye yaz ve cevap dön
        let currentConversationId: string | undefined = conversationId;
        async function persistAndRespond(aiText: string) {
            if (currentConversationId) {
                await prisma.conversation.update({
                    where: { id: currentConversationId, userId },
                    data: {
                        messages: {
                            push: [
                                { role: "user", content: userMessage.content },
                                { role: "assistant", content: aiText },
                            ],
                        } as any,
                    },
                });
            } else {
                const created = await prisma.conversation.create({
                    data: {
                        title: userMessage.content.substring(0, 50),
                        chatbot: { connect: { id: chatbotId } },
                        messages: [
                            { role: "user", content: userMessage.content },
                            { role: "assistant", content: aiText },
                        ],
                        user: { connect: { id: userId } },
                    },
                    select: { id: true },
                });
                currentConversationId = created.id;
            }
            return NextResponse.json({
                text: aiResponseText,
                conversationId: currentConversationId,
            });
        }
        if (isStrict && !finalContext) {
            return await persistAndRespond(
                "Üzgünüm, bu bilgi yüklediğiniz belgelerde bulunmuyor."
            );
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
                { role: "user", content: userMessage.content },
            ],
        });

        const aiResponseText =
            completion.choices[0]?.message?.content ?? "Bir sorun oluştu.";

        return await persistAndRespond(aiResponseText);
    } catch (err) {
        console.error("Chat API hatası:", err);
        return NextResponse.json({ error: "Sunucuda bir hata oluştu" }, { status: 500 });
    }
}

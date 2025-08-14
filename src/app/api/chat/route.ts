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

type Row = { content: string };

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const userId = session.user.id;
    const orgId = session.user.organizationId ?? null;

    try {
        const { messages, conversationId, chatbotId } = await req.json();

        // güvenlik: zorunlu alanlar
        if (!chatbotId || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
        }

        // bu chatbot gerçekten bu kullanıcıya (ve/veya organizasyona) ait mi?
        const bot = await prisma.chatbot.findFirst({
            where: {
                id: chatbotId,
                userId,
                // organizationId: orgId, // org kontrolü kullanıyorsan aç
            },
            select: { id: true, name: true, systemPrompt: true, mode: true },
        });

        if (!bot) {
            return NextResponse.json({ error: "Bu bota erişim yok" }, { status: 403 });
        }

        const userMessage = messages[messages.length - 1] as { content: string };
        const queryEmbedding = await embeddings.embedQuery(userMessage.content);
        const lit = `[${queryEmbedding.join(",")}]`;

        // 🔎 PGVECTOR TOP-K (JS cosine çöp oldu)
        const rows: Row[] = await prisma.$queryRaw`
      SELECT "content"
      FROM "Document"
      WHERE "chatbotId" = ${chatbotId} AND "userId" = ${userId}
      ORDER BY "embeddingVec" <=> ${lit}::vector
      LIMIT 5
    `;

        const top5 = rows.map((r) => ({ content: r.content }));
        const bestContext = top5[0]?.content ?? "";
        const isStrict = bot.mode === "STRICT";

        // strict modda kaynak yoksa, “kaynaklarda yok” de ve kaydet
        if (isStrict && !bestContext) {
            const aiResponseText = "Üzgünüm, bu bilgi yüklediğiniz belgelerde bulunmuyor.";

            // konuşma id hoist
            let currentConversationId: string | undefined = conversationId;

            if (currentConversationId) {
                await prisma.conversation.update({
                    where: { id: currentConversationId, userId },
                    data: {
                        messages: {
                            push: [
                                { role: "user", content: userMessage.content },
                                { role: "assistant", content: aiResponseText },
                            ],
                        } as any,
                    },
                });
            } else {
                const created = await prisma.conversation.create({
                    data: {
                        title: userMessage.content.substring(0, 50),
                        chatbot: { connect: { id: chatbotId } },
                        user: { connect: { id: userId } },
                        messages: [
                            { role: "user", content: userMessage.content },
                            { role: "assistant", content: aiResponseText },
                        ],
                    },
                });
                currentConversationId = created.id;
            }

            return NextResponse.json({
                text: aiResponseText,
                conversationId: currentConversationId,
            });
        }

        const systemPrompt = `
${bot.systemPrompt ?? "Yardımsever ve net yanıt ver."}

Kurallar:
${isStrict ? "- SADECE aşağıdaki kaynaklardan yanıt ver." : "- Önce kaynakları kullan, gerekirse genel bilgini ekle."}

KAYNAKLAR:
---
${bestContext || "Yok"}
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

        // konuşma id hoist
        let currentConversationId: string | undefined = conversationId;

        if (currentConversationId) {
            await prisma.conversation.update({
                where: { id: currentConversationId, userId },
                data: {
                    messages: {
                        push: [
                            { role: "user", content: userMessage.content },
                            { role: "assistant", content: aiResponseText },
                        ],
                    } as any,
                },
            });
        } else {
            const created = await prisma.conversation.create({
                data: {
                    title: userMessage.content.substring(0, 50),
                    chatbot: { connect: { id: chatbotId } },
                    user: { connect: { id: userId } },
                    messages: [
                        { role: "user", content: userMessage.content },
                        { role: "assistant", content: aiResponseText },
                    ],
                },
            });
            currentConversationId = created.id;
        }

        return NextResponse.json({
            text: aiResponseText,
            conversationId: currentConversationId,
        });
    } catch (err) {
        console.error("Chat API hatası:", err);
        return NextResponse.json({ error: "Sunucuda bir hata oluştu" }, { status: 500 });
    }
}

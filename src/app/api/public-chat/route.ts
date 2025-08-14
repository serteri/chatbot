import { NextResponse } from "next/server";
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
  try {
    const { messages, conversationId, chatbotId } = await req.json();

    if (!chatbotId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    // chatbot’u ve sahibini bul
    const bot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { id: true, userId: true, systemPrompt: true, mode: true },
    });
    if (!bot) {
      return NextResponse.json({ error: "Chatbot bulunamadı" }, { status: 404 });
    }

    const ownerUserId = bot.userId; // public konuşmaları sahibine yazıyoruz
    const userMessage = messages[messages.length - 1] as { content: string };

    // pgvector top-k
    const q = await embeddings.embedQuery(userMessage.content);
    const lit = `[${q.join(",")}]`;

    const rows: Row[] = await prisma.$queryRaw`
      SELECT "content"
      FROM "Document"
      WHERE "chatbotId" = ${chatbotId}
      ORDER BY "embeddingVec" <=> ${lit}::vector
      LIMIT 5
    `;

    const bestContext = rows[0]?.content ?? "";
    const isStrict = bot.mode === "STRICT";

    if (isStrict && !bestContext) {
      const aiResponseText =
          "Üzgünüm, bu bilgi yüklediğiniz belgelerde bulunmuyor.";

      let currentConversationId: string | undefined = conversationId;
      if (currentConversationId) {
        await prisma.conversation.update({
          where: { id: currentConversationId, userId: ownerUserId },
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
            user: { connect: { id: ownerUserId } },
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

    let currentConversationId: string | undefined = conversationId;

    if (currentConversationId) {
      await prisma.conversation.update({
        where: { id: currentConversationId, userId: ownerUserId },
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
          user: { connect: { id: ownerUserId } },
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
    console.error("Public Chat API hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

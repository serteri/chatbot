import prisma from "@/lib/prisma";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-small",
});

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0, magA = 0, magB = 0;
  if (vecA.length !== vecB.length) return 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] ** 2;
    magB += vecB[i] ** 2;
  }
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function POST(req: Request) {
  try {
    const { messages, chatbotId, mode = "flexible", conversationId } = await req.json();

    if (!chatbotId) {
      return new Response(JSON.stringify({ error: "Chatbot ID'si eksik" }), { status: 400 });
    }

    const userMessage = messages[messages.length - 1];

    const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
    if (!chatbot) {
      return new Response(JSON.stringify({ error: "Chatbot bulunamadı" }), { status: 404 });
    }

    const userId = chatbot.userId;

    const questionEmbedding = await embeddings.embedQuery(userMessage.content);
    const userDocuments = await prisma.document.findMany({ where: { userId, chatbotId } });

    const scoredDocs = userDocuments.map(doc => ({
      content: doc.content,
      score: cosineSimilarity(questionEmbedding, doc.embedding),
    }));

    scoredDocs.sort((a, b) => b.score - a.score);
    const top5Docs = scoredDocs.slice(0, 5);

    const rerankPrompt = `
Kullanıcı Sorusu: "${userMessage.content}"
Aşağıda numaralandırılmış dokümanlar bulunmaktadır. Bu soruya en iyi cevabı içeren dokümanın numarasını seç. Sadece tek bir numara döndür.
---
${top5Docs.map((doc, i) => `Doküman ${i + 1}:\n"${doc.content}"`).join("\n\n")}
`.trim();

    let finalContext = "";
    if (top5Docs.length > 0) {
      const rerank = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: rerankPrompt }],
        temperature: 0,
      });

      const match = rerank.choices[0].message.content?.match(/\d+/);
      if (match) {
        const bestIndex = parseInt(match[0]) - 1;
        if (top5Docs[bestIndex]) {
          finalContext = top5Docs[bestIndex].content;
        }
      }
    }

    const systemPrompt = mode === "strict"
      ? `
Sen, ticari destek amaçlı özel eğitilmiş bir AI asistansın.

Aşağıda verilen **belge içeriğini** kullanarak kullanıcının sorusuna **sadece bu bilgiye dayanarak** cevap ver:
---
${finalContext || "Belge içeriği bulunamadı."}
---

‼️ Uyarılar:
- Belge içeriğinde doğrudan bir cevap yoksa "bu bilgi belgede yer almıyor" de.
- Kendi yorumunu, genel bilgiyi veya tahmini asla kullanma.
- "Belgeye göre..." gibi ifadeler kullanma. Cevabı doğrudan ver.
- Açıklamayı kısa ve net yap.
`.trim()
      : `
Sen yardımsever ve bilgili bir yapay zekasın.

Eğer aşağıdaki bilgi kaynağında kullanıcının sorusuna cevap varsa, oraya dayalı bir cevap ver.
Eğer yeterli bilgi yoksa, kendi genel bilginle açıklayıcı ve faydalı bir yanıt oluştur.

Bilgi Kaynağı:
---
${finalContext || "Belge bulunamadı"}
---
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage.content },
      ],
    });

    const aiResponseText = completion.choices[0].message.content || "Bir sorun oluştu.";

    // 🧠 Konuşma geçmişi yönetimi
    let currentConversationId = conversationId;

    if (currentConversationId) {
      await prisma.conversation.update({
        where: { id: currentConversationId },
        data: {
          messages: {
            push: [
              { role: "user", content: userMessage.content },
              { role: "assistant", content: aiResponseText },
            ],
          },
        },
      });
    } else {
      const newConversation = await prisma.conversation.create({
        data: {
          title: userMessage.content.substring(0, 50),
          chatbot: { connect: { id: chatbotId } },
          user: { connect: { id: userId } },
          messages: [
            { role: "user", content: userMessage.content },
            { role: "assistant", content: aiResponseText },
          ],
        }
      });
      currentConversationId = newConversation.id;
    }

    return new Response(JSON.stringify({
      text: aiResponseText,
      conversationId: currentConversationId,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Public Chat API Hatası:", error);
    return new Response(JSON.stringify({ error: "Sunucu hatası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
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

function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0, magA = 0, magB = 0;
    if (vecA.length !== vecB.length) return 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz erişim", { status: 401 });

    const userId = session.user.id;
    const orgId = session.user.organizationId; // 🔐 multi-tenant

    try {
        const { messages, conversationId, chatbotId } = await req.json();

        // 🧱 zorunlu: hangi botla konuşuyoruz?
        if (!chatbotId) {
            return new Response(JSON.stringify({ error: "Chatbot ID gerekli" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 🔐 bu bot gerçekten bu kullanıcı + organizasyona mı ait?
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId, organizationId: orgId },
            select: { id: true },
        });
        if (!bot) {
            return new Response(JSON.stringify({ error: "Bu bota erişim yok" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const userMessage = messages[messages.length - 1];
        const questionEmbedding = await embeddings.embedQuery(userMessage.content);

        // sadece bu botun + bu kullanıcının dokümanları
        const allDocs = await prisma.document.findMany({
            where: { userId, chatbotId },
            select: { content: true, embedding: true },
        });

        // 1) cosine ile kaba skorla en iyileri bul
        const scoredDocs = allDocs.map((doc) => ({
            content: doc.content,
            score: cosineSimilarity(questionEmbedding, doc.embedding as unknown as number[]),
        })).sort((x,y)=>y.score-x.score).slice(0,5);

        // 2) LLM ile basit rerank (ucuz model)
        let finalContext = "";
        if (scoredDocs.length > 0) {
            const rerankPrompt =
                `Kullanıcı Sorusu: "${userMessage.content}"\n` +
                `Aşağıda numaralandırılmış dokümanlar var. En alakalı olanın numarasını TEK sayı olarak döndür.\n\n` +
                scoredDocs.map((d, i) => `Doküman ${i + 1}:\n"${d.content}"`).join("\n\n");

            const rerank = await openai.chat.completions.create({
                model: "gpt-4o-mini", // hızlı/ucuz; istersen eskiyi bırak
                messages: [{ role: "system", content: rerankPrompt }],
                temperature: 0,
            });
            const bestDocIndexMatch = rerank.choices[0].message.content?.match(/\d+/);
            if (bestDocIndexMatch) {
                const idx = parseInt(bestDocIndexMatch[0], 10) - 1;
                if (scoredDocs[idx]) finalContext = scoredDocs[idx].content;
            }
        }

        // 3) nihai cevap
        const systemPrompt = `
Sen, yardımsever bir AI asistanısın.
Öncelikle sana verilen kaynaklardan cevapla. Kaynaklar boşsa ya da alakasızsa genel bilgini kullan.
Cevaplarında teknik terimler kullanma.

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
            completion.choices[0].message.content || "Bir sorun oluştu.";

        let currentConversationId = conversationId;

        if (currentConversationId) {
            // mevcut konuşmaya mesaj ekle
            await prisma.conversation.update({
                where: { id: currentConversationId, userId },
                data: {
                    messages: {
                        // not: JSON array ise push bazı sürümlerde sorun çıkarabilir; sorun olursa önce oku-sonra set yap
                        push: [
                            { role: "user", content: userMessage.content },
                            { role: "assistant", content: aiResponseText },
                        ],
                    } as any,
                },
            });
        } else {
            // yeni konuşma aç
            const newConversation = await prisma.conversation.create({
                data: {
                    title: userMessage.content.substring(0, 50),
                    chatbot: { connect: { id: chatbotId } }, // ❌ fallback yok
                    messages: [
                        { role: "user", content: userMessage.content },
                        { role: "assistant", content: aiResponseText },
                    ],
                    user: { connect: { id: userId } },
                },
            });
            currentConversationId = newConversation.id;
        }

        return new Response(
            JSON.stringify({ text: aiResponseText, conversationId: currentConversationId }),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Chat API hatası:", error);
        return new Response(JSON.stringify({ error: "Sunucuda bir hata oluştu" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

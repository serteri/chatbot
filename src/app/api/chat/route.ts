import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY!, model: "text-embedding-3-small" });

function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0, magA = 0, magB = 0;
    if(vecA.length !== vecB.length) return 0;
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
    if (!session || !session.user?.id) { return new Response("Yetkisiz erişim", { status: 401 }); }
    const userId = session.user.id;

    try {
        const { messages,conversationId,chatbotId } = await req.json();

        const userMessage = messages[messages.length - 1];
        const questionEmbedding = await embeddings.embedQuery(userMessage.content);

        const allDocs = await prisma.document.findMany({ where: { userId,chatbotId } });

        // 1. GENİŞ ARAMA: En iyi 5 sonucu, katı bir filtre olmadan alıyoruz.
        const scoredDocs = allDocs.map(doc => ({
            content: doc.content,
            score: cosineSimilarity(questionEmbedding, doc.embedding)
        }));
        scoredDocs.sort((a, b) => b.score - a.score);
        const top5Docs = scoredDocs.slice(0, 5);

        // 2. AKILLI YENİDEN SIRALAMA (RERANKING)
        const rerankPrompt = `
        Kullanıcı Sorusu: "${userMessage.content}"
        Aşağıda numaralandırılmış dokümanlar bulunmaktadır. Bu soruya en iyi cevabı içeren dokümanın numarasını seç. Sadece tek b
ir numara döndür. Eğer hiçbiri tam olarak alakalı değilse, en yakın olanı seç.        
        ${top5Docs.map((doc, index) => `Doküman ${index + 1}:\n"${doc.content}"`).join('\n\n')}
        `;

        let finalContext = "";
        if (top5Docs.length > 0) {
            const rerankCompletion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo", // Bu işlem için daha hızlı bir model yeterli
                messages: [{ role: "system", content: rerankPrompt }],
                temperature: 0,
            });
            const bestDocIndexMatch = rerankCompletion.choices[0].message.content?.match(/\d+/);
            if (bestDocIndexMatch) {
                const bestDocIndex = parseInt(bestDocIndexMatch[0], 10) - 1;
                if (top5Docs[bestDocIndex]) {
                    finalContext = top5Docs[bestDocIndex].content;
                }
            }
        }

        // 3. NİHAİ PROMPT VE CEVAP ÜRETİMİ
        const systemPrompt = `
Sen, yardımsever bir AI asistanısın.
Kullanıcının sorusunu cevaplamak için ÖNCELİKLE sana verilen "BİLGİ KAYNAKLARI"nı kullan.
Eğer cevap bu kaynaklarda varsa, cevabını yalnızca bu bilgilere dayandır.
Eğer kaynaklar boşsa VEYA soru kaynaklarla tamamen alakasızsa (örneğin "nasılsın?", "türkiye'nin başkenti neresi?" gibi), o zaman kendi genel bilgini kullanarak cevap ver.
Cevaplarında asla "BİLGİ KAYNAKLARI" gibi teknik terimler kullanma.

BİLGİ KAYNAKLARI:
---
${finalContext || "Yok"}
---
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage.content }],
        });
        const aiResponseText = completion.choices[0].message.content || "Bir sorun oluştu.";

        let currentConversationId = conversationId;

        if (currentConversationId) {
            // Mevcut konuşmayı güncelle
            await prisma.conversation.update({
                where: { id: currentConversationId, userId: userId },
                data: { messages: { push: [{ role: "user", content: userMessage.content }, { role: "assistant", content: aiResponseText }] } }
            });
        } else {

            // Yeni bir konuşma oluştur
            const newConversation = await prisma.conversation.create({
                data: {
                    title: userMessage.content.substring(0, 50),
                    chatbot: { connect: { id: chatbotId || "default-public-chatbot-id" } },
                    messages: [
                        { role: "user", content: userMessage.content },
                        { role: "assistant", content: aiResponseText }
                    ],
                    user: { connect: { id: userId } },

                }
            });
            currentConversationId = newConversation.id;

        }
        return new Response(JSON.stringify({ text: aiResponseText, conversationId: currentConversationId}));
    } catch (error) {
        console.error("Chat API hatası:", error);
        return new Response(JSON.stringify({ error: "Sunucuda bir hata oluştu" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
});

function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dot = 0, a = 0, b = 0;
    if (vecA.length !== vecB.length) return 0;
    for (let i = 0; i < vecA.length; i++) { dot += vecA[i] * vecB[i]; a += vecA[i] ** 2; b += vecB[i] ** 2; }
    a = Math.sqrt(a); b = Math.sqrt(b);
    if (!a || !b) return 0;
    return dot / (a * b);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    try {
        const { messages, conversationId, chatbotId } = await req.json();

        const userId = session.user.id;
        const orgId = session.user.organizationId;

        if (!chatbotId) {
            return new Response(JSON.stringify({ error: "Chatbot ID gerekli" }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // bot erişimi
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId, organizationId: orgId },
            select: { id: true, mode: true, systemPrompt: true },
        });
        if (!bot) return new Response(JSON.stringify({ error: "Erişim yok" }), { status: 403 });

        const userMessage = (messages as Array<{ role: string; content: string }>).at(-1)!;

        // RAG: embed + brute force cosine + mini rerank
        const qEmb = await embeddings.embedQuery(userMessage.content);
        const docs = await prisma.document.findMany({
            where: { userId, chatbotId },
            select: { content: true, embedding: true },
        });

        const top5 = docs.map(d => ({
            content: d.content,
            score: cosineSimilarity(qEmb, d.embedding as unknown as number[])
        })).sort((x,y)=>y.score-x.score).slice(0,5);

        let finalContext = "";
        if (top5.length > 0) {
            const rerankPrompt =
                `Kullanıcı Sorusu: "${userMessage.content}"\n` +
                `Aşağıda numaralandırılmış dokümanlar var. En alakalı olanın numarasını TEK sayı olarak döndür.\n\n` +
                top5.map((d,i)=>`Doküman ${i+1}:\n"${d.content}"`).join("\n\n");
            const rerank = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: rerankPrompt }],
                temperature: 0,
            });
            const m = rerank.choices[0].message.content?.match(/\d+/);
            if (m) {
                const idx = parseInt(m[0],10)-1;
                if (top5[idx]) finalContext = top5[idx].content;
            }
        }

        const isStrict = bot.mode === "STRICT";

        // persist helper (konuşmayı günceller/oluşturur)
        let currentConversationId: string | undefined = conversationId;
        const persist = async (aiText: string) => {
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
                        title: userMessage.content.substring(0,50),
                        chatbot: { connect: { id: chatbotId } },
                        messages: [
                            { role: "user", content: userMessage.content },
                            { role: "assistant", content: aiText },
                        ],
                        user: { connect: { id: userId } },
                    },
                });
                currentConversationId = created.id;
            }
            return currentConversationId!;
        };

        // STRICT + context yoksa tek cümle stream et ve bitir
        if (isStrict && !finalContext) {
            const text = "Üzgünüm, bu bilgi yüklediğiniz belgelerde bulunmuyor.";
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    controller.enqueue(encoder.encode(text));
                    const cid = await persist(text);
                    controller.enqueue(encoder.encode(`\n__CID__:${cid}`)); // son satırda cid iletiyoruz
                    controller.close();
                }
            });
            return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }

        const baseBehavior = bot.systemPrompt?.trim()?.length
            ? bot.systemPrompt!.trim()
            : "Sen, yardımsever bir AI asistanısın.";

        const systemPrompt = `
${baseBehavior}

Kurallar:
${isStrict
            ? "- SADECE aşağıdaki kaynaklardan yanıt ver. Kaynak yoksa cevap verme."
            : "- Öncelikle kaynaklardan yanıt ver; kaynaklar yetersizse genel bilgini kullan."}

KAYNAKLAR:
---
${finalContext || "Yok"}
---
`.trim();

        const openaiStream = await openai.chat.completions.create({
            model: "gpt-4o",
            stream: true,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage.content },
            ],
        });

        const encoder = new TextEncoder();
        let fullText = "";

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const part of openaiStream) {
                        const token = part.choices?.[0]?.delta?.content || "";
                        if (token) {
                            fullText += token;
                            controller.enqueue(encoder.encode(token));
                        }
                    }
                    const cid = await persist(fullText || "Bir sorun oluştu.");
                    controller.enqueue(encoder.encode(`\n__CID__:${cid}`));
                } catch (e) {
                    controller.enqueue(encoder.encode("\n[stream hata]"));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch (err) {
        console.error("chat/stream error:", err);
        return new Response("Sunucu hatası", { status: 500 });
    }
}

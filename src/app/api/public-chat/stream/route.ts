import prisma from "@/lib/prisma";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";

export const runtime = "nodejs";
type DocRow = {
    content: string;
    embedding: number[] | null; // prisma'da JSON[] ya da null olabilir
};
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const embedder = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY!,
});


function cosineSimilarity(a: number[], b: number[]) {
    let d=0, x=0, y=0;
    if (a.length !== b.length) return 0;
    for (let i=0;i<a.length;i++){ d+=a[i]*b[i]; x+=a[i]*a[i]; y+=b[i]*b[i]; }
    x=Math.sqrt(x); y=Math.sqrt(y);
    if (!x||!y) return 0;
    return d/(x*y);
}

export async function POST(req: Request) {
    try {
        const { messages, chatbotId, conversationId } = await req.json();
        if (!chatbotId) return new Response("chatbotId gerekli", { status: 400 });

        // public bot kontrolü (basit): bot var mı?
        const bot = await prisma.chatbot.findUnique({
            where: { id: chatbotId },
            select: { id: true, userId: true, mode: true, systemPrompt: true },
        });
        if (!bot) return new Response("Bot yok", { status: 404 });

        const userMessage = (messages as Array<{ role: string; content: string }>).at(-1)!;

        // RAG
        const qEmb: number[] = await embedder.embedQuery(userMessage.content);
        const docs = await prisma.document.findMany({
            where: { chatbotId }, // sende neyse o
            select: { content: true, embedding: true },
        }) as DocRow[];

        const top5 = docs
            // embedding null veya yanlış tip ise ayıkla + type guard
            .filter((d: DocRow): d is { content: string; embedding: number[] } => Array.isArray(d.embedding))
            .map((d) => ({
                content: d.content,
                score: cosineSimilarity(qEmb, d.embedding),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        let finalContext = "";
        if (top5.length) {
            const rerankPrompt =
                `Kullanıcı Sorusu: "${userMessage.content}"\n` +
                `Aşağıdaki dokümanlardan en ilgili olanın numarasını döndür.\n\n` +
                top5.map((d,i)=>`Doküman ${i+1}:\n"${d.content}"`).join("\n\n");
            const rr = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: rerankPrompt }],
                temperature: 0,
            });
            const m = rr.choices[0].message.content?.match(/\d+/);
            if (m) {
                const idx = parseInt(m[0],10)-1;
                if (top5[idx]) finalContext = top5[idx].content;
            }
        }

        const isStrict = bot.mode === "STRICT";

        // persist helper (public kullanıcı için userId yok; anonim)
        let currentConversationId: string | undefined = conversationId;
        const persist = async (aiText: string) => {
            if (currentConversationId) {
                await prisma.conversation.update({
                    where: { id: currentConversationId },
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
                        user: { connect: { id: bot.userId! } }
                    },
                });
                currentConversationId = created.id;
            }
            return currentConversationId!;
        };

        if (isStrict && !finalContext) {
            const text = "Üzgünüm, bu bilgi yüklediğiniz belgelerde bulunmuyor.";
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    controller.enqueue(encoder.encode(text));
                    const cid = await persist(text);
                    controller.enqueue(encoder.encode(`\n__CID__:${cid}`));
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

        const ai = await openai.chat.completions.create({
            model: "gpt-4o",
            stream: true,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage.content },
            ],
        });

        const encoder = new TextEncoder();
        let full = "";

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const part of ai) {
                        const token = part.choices?.[0]?.delta?.content || "";
                        if (token) {
                            full += token;
                            controller.enqueue(encoder.encode(token));
                        }
                    }
                    const cid = await persist(full || "Bir sorun oluştu.");
                    controller.enqueue(encoder.encode(`\n__CID__:${cid}`));
                } catch {
                    controller.enqueue(encoder.encode("\n[stream hata]"));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch (e) {
        console.error("public-chat/stream error:", e);
        return new Response("Sunucu hatası", { status: 500 });
    }
}

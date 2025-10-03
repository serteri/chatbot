import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { isBlocked } from "@/lib/moderation";
import { privateChatLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Row = { content: string; distance: number };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
});

// Basit sohbet/selamlama tespiti
function isChitChat(s: string) {
    const txt = (s || "").toLowerCase();
    return /\b(hello|hi|hey|selam|merhaba|günaydın|iyi akşamlar|iyi geceler|nasılsın)\b/.test(txt);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Yetkisiz", { status: 401 });

    const userId = session.user.id;
    const orgId = session.user.organizationId;

    // Rate limit (güvenli; rateLimit.ts memory fallback içeriyor)
    try {
        const key = `user:${userId}`;
        const { success, limit, remaining, reset } = await privateChatLimiter.limit(key);
        if (!success) {
            return new Response("Too Many Requests", {
                status: 429,
                headers: {
                    "X-RateLimit-Limit": String(limit),
                    "X-RateLimit-Remaining": String(remaining),
                    "X-RateLimit-Reset": String(reset),
                },
            });
        }
    } catch {
        // limiter patlarsa akışı kesme
    }

    try {
        const { messages, conversationId, chatbotId,mode } = await req.json();

        if (!chatbotId) {
            return new Response(JSON.stringify({ error: "Chatbot ID gerekli" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // bot erişimi (kullanıcı ve organizasyon filtresi)
        const bot = await prisma.chatbot.findFirst({
            where: { id: chatbotId, userId, organizationId: orgId },
            select: { id: true, mode: true, systemPrompt: true },
        });
        if (!bot) return new Response(JSON.stringify({ error: "Erişim yok" }), { status: 403 });

        const userMessage = (messages as Array<{ role: string; content: string }>).at(-1)!;

        // Moderation
        if (await isBlocked(userMessage.content)) {
            return new Response("blocked", { status: 400 });
        }

        // RAG: pgvector ile en yakın 5
        const qEmb: number[] = await embeddings.embedQuery(userMessage.content);

        const rows = await prisma.$queryRaw<Row[]>`
      SELECT "content",
             "embeddingVec" <=> ${qEmb}::vector AS distance
      FROM "Document"
      WHERE "chatbotId" = ${chatbotId}
      ORDER BY "embeddingVec" <=> ${qEmb}::vector
      LIMIT 5;
    `;

        // distance küçük = daha benzer; score = 1 - distance
        const top5 = (rows || []).map((r) => ({ content: r.content, score: 1 - r.distance }));

        // mini rerank (opsiyonel)
        let finalContext = "";
        if (top5.length) {
            const rerankPrompt =
                `Kullanıcı Sorusu: "${userMessage.content}"\n` +
                `Aşağıdaki dokümanlardan en ilgili olanın numarasını döndür.\n\n` +
                top5.map((d, i) => `Doküman ${i + 1}:\n"${d.content}"`).join("\n\n");
            const rr = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: rerankPrompt }],
                temperature: 0,
            });
            const m = rr.choices[0].message.content?.match(/\d+/);
            if (m) {
                const idx = parseInt(m[0], 10) - 1;
                if (top5[idx]) finalContext = top5[idx].content;
            }
        }

        const effectiveMode = mode || bot.mode;
        const isStrict = effectiveMode === "STRICT";

        // Konuşma persist helper
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
                        title: userMessage.content.substring(0, 50),
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

        // ✅ STRICT + context yok → profesyonel metinle cevapla
        if (isStrict && !finalContext) {
            const text = isChitChat(userMessage.content)
                ? "Merhaba. Bu asistan STRICT modda çalışır ve yalnızca yüklediğiniz belgelere dayalı yanıt üretir. İlgili belgeyi ekledikten sonra sorunuzu yineleyin. Genel bilgi için HYBRID modunu kullanabilirsiniz."
                : "Bu talep, mevcut belgelerde yer almıyor. Lütfen ilgili belgeyi ekledikten sonra tekrar deneyin. Genel bilgi yanıtları için HYBRID modunu kullanabilirsiniz.";

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    controller.enqueue(encoder.encode(text));
                    const cid = await persist(text);
                    controller.enqueue(encoder.encode(`\n__CID__:${cid}`));
                    controller.close();
                },
            });
            return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }


        // System prompt
        const baseBehavior = bot.systemPrompt?.trim()?.length
            ? bot.systemPrompt!.trim()
            : "Sen, yardımsever bir AI asistanısın.";

        const systemPrompt = `
${baseBehavior}

Kurallar:
${isStrict
            ? "- SADECE aşağıdaki kaynaklardan yanıt ver. Kaynak yoksa cevap verme (sohbet/selamlamaya izin ver)."
            : "- Öncelikle kaynaklardan yanıt ver; kaynaklar yetersizse genel bilgini kullan."}

KAYNAKLAR:
---
${finalContext || "Yok"}
---
`.trim();

        // OpenAI stream
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
            },
        });

        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch (err) {
        console.error("chat/stream error:", err);
        return new Response("Sunucu hatası", { status: 500 });
    }
}

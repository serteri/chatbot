import prisma from "@/lib/prisma";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { isBlocked } from "@/lib/moderation";
import { publicChatLimiter, getIpFromRequest } from "@/lib/rateLimit";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const embedder = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY!,
});

// host allowlist helpers
function hostsFromEnv(list?: string | null) {
    if (!list) return [];
    return list
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((urlOrHost) => {
            try {
                return new URL(urlOrHost).hostname;
            } catch {
                return urlOrHost;
            }
        });
}

export async function POST(req: Request) {
    try {
        // 0) Rate limit
        const ip = getIpFromRequest(req);
        const { success, limit, remaining, reset } = await publicChatLimiter.limit(`bot:${ip}`);
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

        // 1) Body (tek kez)
        const body = await req.json().catch(() => ({}));
        const { messages, chatbotId, conversationId } = body || {};
        if (!chatbotId) return new Response("chatbotId gerekli", { status: 400 });
        if (!Array.isArray(messages) || messages.length === 0)
            return new Response("messages gerekli", { status: 400 });

        // 2) Bot bul + fallback
        let bot = await prisma.chatbot.findUnique({
            where: { id: chatbotId },
            select: {
                id: true,
                userId: true,
                mode: true,
                systemPrompt: true,
                embedAllowlist: true,
                isPublic: true,
            },
        });

        if (!bot) {
            bot = await prisma.chatbot.findFirst({
                where: { isPublic: true },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    userId: true,
                    mode: true,
                    systemPrompt: true,
                    embedAllowlist: true,
                    isPublic: true,
                },
            });
        }
        if (!bot) return new Response("Bot yok", { status: 404 });

        // 3) Allowlist (referer host)
        const referer = req.headers.get("referer") || "";
        const host = new URL(referer || "http://localhost").hostname;
        const envAllowed = hostsFromEnv(process.env.EMBED_ALLOWED_ORIGINS);
        const dbAllowed = Array.isArray(bot.embedAllowlist) ? (bot.embedAllowlist as string[]) : [];
        const allow = !!host && (dbAllowed.includes(host) || envAllowed.includes(host));
        if (!allow) return new Response("forbidden", { status: 403 });

        // 4) Moderation
        const userMessage = (messages as Array<{ role: string; content: string }>).at(-1)!;
        if (await isBlocked(userMessage.content)) {
            return new Response("blocked", { status: 400 });
        }

        // 5) RAG (pgvector) — bot.id ile sorgula
        const qEmb: number[] = await embedder.embedQuery(userMessage.content);
        type Row = { content: string; distance: number };
        const rows = await prisma.$queryRaw<Row[]>`
      SELECT "content",
             "embeddingVec" <=> ${qEmb}::vector AS distance
      FROM "Document"
      WHERE "chatbotId" = ${bot.id}
      ORDER BY "embeddingVec" <=> ${qEmb}::vector
      LIMIT 5;
    `;
        const top5 = rows.map((r) => ({ content: r.content, score: 1 - r.distance }));

        // 6) Mini rerank (opsiyonel)
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

        const isStrict = bot.mode === "STRICT";

        // 7) Persist helper (bot.userId guard)
        let currentConversationId: string | undefined = conversationId;
        const persist = async (aiText: string) => {
            try {
                if (!bot?.userId) {
                    console.error("[public-chat/stream] persist guard: bot.userId yok");
                    return currentConversationId ?? "PUBLIC_NO_SAVE";
                }
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
                            title: userMessage.content.substring(0, 50),
                            chatbot: { connect: { id: bot.id } },
                            messages: [
                                { role: "user", content: userMessage.content },
                                { role: "assistant", content: aiText },
                            ],
                            user: { connect: { id: bot.userId } },
                        },
                    });
                    currentConversationId = created.id;
                }
                return currentConversationId!;
            } catch (e) {
                console.error("[public-chat/stream] persist error:", e);
                return currentConversationId ?? "PUBLIC_SAVE_FAIL";
            }
        };

        // 8) STRICT + context yoksa kısa dön
        if (isStrict && !finalContext) {
            const text = "Üzgünüm, bu bilgi yüklediğiniz belgelerde bulunmuyor.";
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(c) {
                    c.enqueue(encoder.encode(text));
                    const cid = await persist(text);
                    c.enqueue(encoder.encode(`\n__CID__:${cid}`));
                    c.close();
                },
            });
            return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }

        // 9) System prompt
        const baseBehavior = bot.systemPrompt?.trim()?.length
            ? bot.systemPrompt!.trim()
            : "Sen, yardımsever bir AI asistanısın.";
        const systemPrompt = `
${baseBehavior}

Kurallar:
${isStrict ? "- SADECE aşağıdaki kaynaklardan yanıt ver. Kaynak yoksa cevap verme."
            : "- Öncelikle kaynaklardan yanıt ver; kaynaklar yetersizse genel bilgini kullan."}

KAYNAKLAR:
---
${finalContext || "Yok"}
---
`.trim();

        // 10) OpenAI stream
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
            async start(c) {
                try {
                    for await (const part of ai) {
                        const token = part.choices?.[0]?.delta?.content || "";
                        if (token) {
                            full += token;
                            c.enqueue(encoder.encode(token));
                        }
                    }
                    const cid = await persist(full || "Bir sorun oluştu.");
                    c.enqueue(encoder.encode(`\n__CID__:${cid}`));
                } catch {
                    c.enqueue(encoder.encode("\n[stream hata]"));
                } finally {
                    c.close();
                }
            },
        });

        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch (e) {
        console.error("public-chat/stream error:", e);
        return new Response("Sunucu hatası", { status: 500 });
    }
}

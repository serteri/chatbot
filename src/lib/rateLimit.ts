// src/lib/rateLimit.ts
import type { Ratelimit as UpstashRatelimitType } from "@upstash/ratelimit";
import type { Redis as UpstashRedisType } from "@upstash/redis";

export type LimitResult = {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number; // epoch seconds
};

export interface Limiter {
    limit(key: string): Promise<LimitResult>;
}

// ---- Provider seçimi: upstash | memory | none ----
const PROVIDER = (process.env.RATE_LIMIT_PROVIDER ?? "").toLowerCase(); // 'upstash' | 'memory' | 'none' | ''

// Varsayılan limitler
const PUB_PER_MIN = Number(process.env.PUBLIC_CHAT_RATELIMIT_PER_MIN ?? "60");
const PRIV_PER_MIN = Number(process.env.PRIVATE_CHAT_RATELIMIT_PER_MIN ?? "120");

// ---- Noop (kapalı) limiter ----
function makeNoopLimiter(limitPerMin: number): Limiter {
    return {
        async limit(_key: string): Promise<LimitResult> {
            // Her zaman geçsin
            const now = Math.floor(Date.now() / 1000);
            return { success: true, limit: limitPerMin, remaining: limitPerMin, reset: now + 60 };
        },
    };
}

// ---- In-memory sliding window limiter (process bazlı) ----
function makeMemoryLimiter(limitPerMin: number, prefix: string): Limiter {
    const WINDOW = 60_000;
    const store = new Map<string, { count: number; start: number }>();

    function now() { return Date.now(); }

    return {
        async limit(key: string): Promise<LimitResult> {
            const k = `${prefix}:${key}`;
            const t = now();
            const cur = store.get(k);
            if (!cur || t - cur.start >= WINDOW) {
                // yeni pencere
                store.set(k, { count: 1, start: t });
                return {
                    success: true,
                    limit: limitPerMin,
                    remaining: Math.max(0, limitPerMin - 1),
                    reset: Math.floor((t + WINDOW) / 1000),
                };
            } else {
                if (cur.count < limitPerMin) {
                    cur.count++;
                    store.set(k, cur);
                    return {
                        success: true,
                        limit: limitPerMin,
                        remaining: Math.max(0, limitPerMin - cur.count),
                        reset: Math.floor((cur.start + WINDOW) / 1000),
                    };
                } else {
                    return {
                        success: false,
                        limit: limitPerMin,
                        remaining: 0,
                        reset: Math.floor((cur.start + WINDOW) / 1000),
                    };
                }
            }
        },
    };
}

// ---- Upstash limiter (varsa) ----
function makeUpstashLimiter(limitPerMin: number, prefix: string): Limiter | null {
    try {
        // Env yoksa kullanma
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url || !token) return null;

        // Dinamik import — build sırasında sorun yaşamamak için
        // (Next edge/deno gibi ortamlarda ESM farkları olabilir)
        const { Ratelimit } = require("@upstash/ratelimit") as { Ratelimit: typeof import("@upstash/ratelimit").Ratelimit };
        const { Redis } = require("@upstash/redis") as { Redis: typeof import("@upstash/redis").Redis };

        const redis: UpstashRedisType = new Redis({ url, token });
        const rl: UpstashRatelimitType = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(limitPerMin, "1 m"),
            analytics: true,
            prefix,
        });

        // Wrapper: asla throw etmesin
        const safe: Limiter = {
            async limit(key: string): Promise<LimitResult> {
                try {
                    const r = await rl.limit(key);
                    // Upstash result: { success, limit, remaining, reset }
                    return {
                        success: r.success,
                        limit: r.limit,
                        remaining: r.remaining,
                        reset: typeof r.reset === "number" ? r.reset : Math.floor(Date.now() / 1000) + 60,
                    };
                } catch (e) {
                    console.error(`[rateLimit upstash error:${prefix}]`, e);
                    // hata olduğunda akışı kesmeyelim
                    const now = Math.floor(Date.now() / 1000);
                    return { success: true, limit: limitPerMin, remaining: limitPerMin, reset: now + 60 };
                }
            },
        };
        return safe;
    } catch (e) {
        console.error("[rateLimit upstash init error]", e);
        return null;
    }
}

// ---- Fabrika: provider seç, yoksa otomatik fallback ----
function buildLimiter(limitPerMin: number, prefix: string): Limiter {
    if (PROVIDER === "none") return makeNoopLimiter(limitPerMin);
    if (PROVIDER === "memory") return makeMemoryLimiter(limitPerMin, prefix);

    // default: upstash dene → yoksa memory
    const up = makeUpstashLimiter(limitPerMin, prefix);
    if (up) return up;
    return makeMemoryLimiter(limitPerMin, prefix);
}

// Export edilen limiter’lar
export const publicChatLimiter: Limiter = buildLimiter(PUB_PER_MIN, "rl:pub");
export const privateChatLimiter: Limiter = buildLimiter(PRIV_PER_MIN, "rl:priv");

// İsteğe bağlı: IP alma yardımcı (public uçlar için)
export function getIpFromRequest(req: Request): string {
    const xf = req.headers.get("x-forwarded-for") || "";
    const ip = xf.split(",")[0]?.trim();
    return ip || "unknown";
}

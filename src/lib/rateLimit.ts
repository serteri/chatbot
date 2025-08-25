import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const perMin = Math.max(1, Number(process.env.PUBLIC_CHAT_RATELIMIT_PER_MIN || 60));

export const publicChatLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(perMin, "1 m"),
    analytics: true,
    prefix: "rl:public",
});

export function getIpFromRequest(req: Request) {
    const xf = req.headers.get("x-forwarded-for");
    if (xf) return xf.split(",")[0].trim();
    const f = req.headers.get("fly-client-ip") || req.headers.get("x-real-ip");
    return f || "unknown";
}




import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60 * 1000;
const LIMIT = Number(process.env.PUBLIC_CHAT_RATELIMIT_PER_MIN || 60);
const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]?.trim();
    const xrip = req.headers.get("x-real-ip");
    if (xrip) return xrip;
    const cf = req.headers.get("cf-connecting-ip");
    if (cf) return cf;
    return "unknown";
}

export function middleware(req: NextRequest) {
    const { pathname } = new URL(req.url);

    // sadece public uçları kısıtla (gerekirse genişlet)
    const isPublic = pathname.startsWith("/api/public-chat") || pathname.startsWith("/api/embed");
    if (!isPublic) return NextResponse.next();

    const key = `${getClientIp(req)}:${req.headers.get("user-agent") ?? ""}`;

    const now = Date.now();
    const b = buckets.get(key) ?? { count: 0, resetAt: now + WINDOW_MS };
    if (now > b.resetAt) { b.count = 0; b.resetAt = now + WINDOW_MS; }
    b.count += 1; buckets.set(key, b);

    const remaining = Math.max(0, LIMIT - b.count);
    const res = remaining >= 0
        ? NextResponse.next()
        : NextResponse.json({ error: "Too Many Requests" }, { status: 429 });

    res.headers.set("X-RateLimit-Limit", String(LIMIT));
    res.headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
    res.headers.set("X-RateLimit-Reset", String(Math.floor(b.resetAt / 1000)));
    return res;
}

export const config = { matcher: ["/api/:path*"] };

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const url = req.nextUrl.pathname;

    // sadece /embed/* sayfalarına CSP ekle
    if (url.startsWith("/embed/")) {
        const res = NextResponse.next();

        const allowList = (process.env.EMBED_ALLOWED_ORIGINS || "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);

        // boşsa dev kolaylığı için localhost’u serbest bırak
        const devDefaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
        const finalList = allowList.length ? allowList : devDefaults;

        // frame-ancestors ile hangi parent domainlerin embed edebileceğini kısıtlıyoruz
        res.headers.set("Content-Security-Policy", `frame-ancestors ${finalList.join(" ")};`);
        // (X-Frame-Options zaten CSP ile redundant; eklemiyoruz)
        return res;
    }

    return NextResponse.next();
}

export default withAuth({
    callbacks: {
        authorized({ token, req }) {
            // /admin → sadece ADMIN
            if (req.nextUrl.pathname.startsWith("/admin")) {
                return token?.role === "ADMIN";
            }
            // diğer korunan sayfalar → login yeterli
            return !!token;
        },
    },
});

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/conversations/:path*",
        "/admin/:path*", // admin panelin varsa
        // API’leri de istersen ekle:
        // "/api/chatbots/:path*",
        // "/api/conversations/:path*",
        // "/api/documents/:path*",
        // "/api/ingest/:path*",
        // "/api/chat/:path*",
    ],
};
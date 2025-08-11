
import { withAuth } from "next-auth/middleware";

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
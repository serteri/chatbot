
import { withAuth } from "next-auth/middleware";


export default withAuth(
    function middleware() {},
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const path = req.nextUrl.pathname;

                // /admin sadece ADMIN
                if (path.startsWith("/admin")) {
                    return token?.role === "ADMIN";
                }
                // dashboard, embed vb. için giriş zorunlu
                if (path.startsWith("/dashboard")) {
                    return !!token;
                }
                // diğer her şey serbest
                return true;
            },
        },
    }
);

export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
    ],
};
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com', // Google için
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com', // GitHub için
            },
            // Microsoft için belirli bir hostname vermek zordur,
            // bu yüzden daha genel bir wildcard kullanabiliriz veya boş bırakabiliriz.
            // Şimdilik bu ikisi yeterli olacaktır.
        ],
    },
    reactStrictMode: true,
    async headers() {
        return [
            {
                source: "/embed/:path*",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: `frame-ancestors ${process.env.EMBED_ALLOWED_ORIGINS?.split(",").join(" ") || "'self'"};`,
                    },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                ],
            },
        ];
    },
};

export default nextConfig;
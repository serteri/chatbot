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

};

export default nextConfig;
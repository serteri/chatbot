import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AzureADProvider from "next-auth/providers/azure-ad"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter" // <-- 1. Adaptörü import et
import prisma from "./prisma" // <-- 2. Prisma client'ımızı import et
import { compare } from "bcrypt"; // bcrypt'i import ediyoruz
import { Role, Plan } from "@prisma/client"

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: 12 * 60 * 60, // 12 saat = 43200 saniye (1 gün için 24*60*60)
        updateAge: 60 * 60,   // (isteğe bağlı) her 1 saatte bir refresh etsin
    },

    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            allowDangerousEmailAccountLinking: true,
        }),
        AzureADProvider({
            clientId: process.env.MICROSOFT_CLIENT_ID as string,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
            tenantId: process.env.AZURE_AD_TENANT_ID as string,
            allowDangerousEmailAccountLinking: true,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
            allowDangerousEmailAccountLinking: true,
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email", placeholder: "email@example.com" },
                password: {  label: "Password", type: "password" }
            },
            async authorize(credentials) {
                console.log("Authorize fonksiyonu çalıştı. Credentials:", credentials);


                if (!credentials?.email || !credentials?.password) {
                    console.log("Email veya şifre eksik.");
                    return null;
                }

                // Prisma ile veritabanından kullanıcıyı bul
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                // Eğer kullanıcı yoksa veya şifresi (henüz) yoksa (örn: Google ile kaydolmuşsa)
                if (!user || !user.hashedPassword) {
                    console.log("Kullanıcı bulunamadı veya şifresi yok.");
                    return null;
                }

                // Girilen şifre ile veritabanındaki hash'lenmiş şifreyi karşılaştır
                const isPasswordValid = await compare(credentials.password, user.hashedPassword);
                console.log("Şifre geçerli mi?:", isPasswordValid);

                if (isPasswordValid) {
                    console.log("Giriş başarılı, kullanıcı objesi döndürülüyor.");
                    // Eğer şifre doğruysa, kullanıcı objesini döndür
                    return user;
                }
                console.log("Şifre yanlış.");
                // Eğer şifre yanlışsa
                return null;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.plan = user.plan;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as Role;
                session.user.plan = token.plan as Plan;
            }
            return session;
        },

    },
    pages: {
        signIn: '/signin',
    }
};
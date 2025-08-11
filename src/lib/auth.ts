import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AzureADProvider from "next-auth/providers/azure-ad"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter" // <-- 1. Adaptörü import et
import prisma from "./prisma" // <-- 2. Prisma client'ımızı import et
import { compare } from "bcrypt"; // bcrypt'i import ediyoruz
import { Role, Plan } from "@prisma/client"

interface ExtendedUser {
    id: string;
    role: Role;
    plan: Plan;
    organizationId: string;
}

function isExtendedUser(user: any): user is ExtendedUser {
    return (
        user &&
        typeof user.id === "string" &&
        (user.role === "ADMIN" || user.role === "USER") &&
        (user.plan === "FREE"  || user.plan === "PRO") &&
        typeof user.organizationId === "string"
    );
}

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
            // ─── Zorunlu hesap seçimini aktif et ───────────────────────────
              authorization: {
            params: {
                  prompt: "select_account",
                      // dilersen access_type ve response_type da ekleyebilirsin:
                          access_type: "offline",
                      response_type: "code",
                    },
          },

        }),
        AzureADProvider({
            clientId: process.env.MICROSOFT_CLIENT_ID as string,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
            tenantId: process.env.AZURE_AD_TENANT_ID as string,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "select_account",
                },
            },
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    allow_signup: "true",   // İstersen false yapıp yeni kaydı kapatabilirsin
                    // GitHub şu an `prompt=select_account` desteklemiyor,
                    // ama `prompt=login` ile her seferinde parola isteyebilirsin:
                    prompt: "login",
                },
            },
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email", placeholder: "email@example.com" },
                password: {  label: "Password", type: "password" }
            },
            async authorize( credentials: Record<"email" | "password", string> | undefined,
                             req: any): Promise<any>  {
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

                if (!isPasswordValid) {
                    console.log("Giriş başarılı, kullanıcı objesi döndürülüyor.");
                    // Eğer şifre doğruysa, kullanıcı objesini döndür
                    return null;
                }
                console.log("Şifre yanlış.");
                // Eğer şifre yanlışsa
                return {
                    id:             user.id,
                    name:           user.name,
                    email:          user.email,
                    emailVerified:  user.emailVerified,
                    image:          user.image,
                    role:           user.role,
                    plan:           user.plan,
                    organizationId: user.organizationId,
                } as any;
            }
        })
    ],
    callbacks: {
        async jwt({token, user}) {
            try {
                // İlk turda user gelebilir; sonraki turlarda token.sub/id var
                const userId =
                    (user as any)?.id ??
                    (typeof token.sub === "string" ? token.sub : undefined) ??
                    (typeof (token as any).id === "string" ? (token as any).id : undefined);

                if (userId) {
                    const dbUser = await prisma.user.findUnique({
                        where: {id: userId},
                        select: {id: true, role: true, plan: true, organizationId: true},
                    });

                    if (dbUser) {
                        (token as any).id = dbUser.id;
                        (token as any).role = dbUser.role;
                        (token as any).plan = dbUser.plan;
                        (token as any).organizationId = dbUser.organizationId; // string | null
                    }
                    if (dbUser && !dbUser.organizationId) {
                        try {
                            const org = await prisma.organization.create({
                                data: { name: `${dbUser.id.slice(0,6)} Org` },
                                select: { id: true },
                            });
                            await prisma.user.update({
                                where: { id: dbUser.id },
                                data: { organizationId: org.id },
                            });
                            (token as any).organizationId = org.id;
                        } catch (err) {
                            console.error("auto-provision org error:", err);
                        }
                    }


                }
            } catch (e) {
                console.error("jwt callback fetch user error:", e);
            }
            return token;
        },

        async session({session, token}) {
            if (session.user) {
                (session.user as any).id = ((token as any).id as string) ?? token.sub;
                (session.user as any).role = (token as any).role as Role | undefined;
                (session.user as any).plan = (token as any).plan as Plan | undefined;
                (session.user as any).organizationId = (token as any).organizationId as string | null | undefined;
            }
            return session;
        },
    }
};
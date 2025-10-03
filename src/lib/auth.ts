// src/lib/auth.ts (BÜTÜN VE TAM HALİ)

import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AzureADProvider from "next-auth/providers/azure-ad"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "./prisma"
import { compare } from "bcrypt";


interface ExtendedUser {
    id: string;
    role: Role;
    plan: Plan;
    organizationId: string;
}

type Role = 'ADMIN' | 'USER';
type Plan = 'FREE' | 'PRO';

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
            authorization: {
                params: {
                    prompt: "select_account",
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
                    allow_signup: "true",
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

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user || !user.hashedPassword) {
                    console.log("Kullanıcı bulunamadı veya şifresi yok.");
                    return null;
                }

                const isPasswordValid = await compare(credentials.password, user.hashedPassword);
                console.log("Şifre geçerli mi?:", isPasswordValid);

                if (!isPasswordValid) {
                    console.log("Giriş başarılı, kullanıcı objesi döndürülüyor.");
                    return null;
                }
                console.log("Şifre yanlış.");
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
            console.log("--- JWT Callback Başladı ---");
            try {
                const userId = (user as any)?.id ?? token.sub;

                if (userId) {
                    console.log(`Kullanıcı ID bulundu: ${userId}`);
                    let dbUser = await prisma.user.findUnique({
                        where: {id: userId},
                        select: {id: true, role: true, plan: true, organizationId: true, trialEndsAt: true},
                    });
                    console.log("Veritabanından kullanıcı çekildi:", dbUser);
                    if (dbUser && dbUser.plan === 'FREE' && !dbUser.trialEndsAt) {
                        const fourteenDaysFromNow = new Date();
                        fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

                        dbUser = await prisma.user.update({
                            where: { id: dbUser.id },
                            data: {
                                plan: 'PRO',
                                trialEndsAt: fourteenDaysFromNow,
                            }
                        });
                    }
                    if (dbUser) {
                        (token as any).id = dbUser.id;
                        (token as any).role = dbUser.role;
                        (token as any).plan = dbUser.plan;
                        (token as any).organizationId = dbUser.organizationId;
                        (token as any).trialEndsAt = dbUser.trialEndsAt;

                        // EN ÖNEMLİ KISIM BURASI
                        if (!dbUser.organizationId) {
                            console.log("KULLANICININ organizationId'si YOK! Yeni bir tane oluşturulacak...");
                            try {
                                const org = await prisma.organization.create({
                                    data: { name: `${dbUser.id.slice(0,6)} Org` },
                                    select: { id: true },
                                });
                                console.log(`Yeni organizasyon oluşturuldu: ${org.id}`);

                                await prisma.user.update({
                                    where: { id: dbUser.id },
                                    data: { organizationId: org.id },
                                });
                                console.log(`Kullanıcı yeni organizasyon ID'si ile güncellendi.`);

                                (token as any).organizationId = org.id;

                            } catch (err) {
                                // Hatanın ne olduğunu görelim
                                console.error("!!! OTOMATİK ORGANİZASYON OLUŞTURMA HATASI:", err);
                            }
                        } else {
                            console.log(`Kullanıcının organizationId'si zaten var: ${dbUser.organizationId}`);
                        }
                    }
                }
            } catch (e) {
                console.error("!!! JWT Callback ana try-catch hatası:", e);
            }
            console.log("--- JWT Callback Bitti, Token:", token);
            return token;
        },

        async session({session, token}) {
            if (session.user) {
                const sUser = session.user as any;
                sUser.id = token.id;
                sUser.role = token.role;
                sUser.plan = token.plan;
                sUser.organizationId = token.organizationId;
                sUser.trialEndsAt = token.trialEndsAt;
            }
            return session;
        },
    },

    // --- YENİ EKLENEN KISIM (ÜCRETSİZ DENEME İÇİN) ---
    events: {
        // Bir kullanıcı veritabanında İLK KEZ oluşturulduğunda bu fonksiyon çalışır.
        createUser: async ({ user }) => {
            // 14 günlük deneme süresi için bitiş tarihini hesapla
            const fourteenDaysFromNow = new Date();
            fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

            // Yeni kullanıcının planını 'PRO' olarak ayarla ve deneme bitiş tarihini kaydet.
            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    plan: 'PRO', // Kullanıcı deneme süresince PRO özelliklerine sahip olacak.
                    trialEndsAt: fourteenDaysFromNow,
                },
            });
        },
    },
    // --- BİTİŞ ---
};
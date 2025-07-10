import { Plan, Role } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface User {
        id: string;
        role: Role;
        plan: Plan;
    }
    interface Session {
        user: {
            id: string;
            role: Role;
            plan: Plan;
        } & DefaultSession["user"];
    }
}

// JWT token'ının tipini de genişletiyoruz
declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: Role;
        plan: Plan;
    }
}

declare module 'pdfjs-dist/build/pdf.mjs';
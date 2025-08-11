import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";
import { Role, Plan } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role?: Role;
            plan?: Plan;
            organizationId?: string | null;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: Role;
        plan?: Plan;
        organizationId?: string | null;
    }
}
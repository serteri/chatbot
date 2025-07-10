import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Ayarları merkezi dosyadan import ediyoruz

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
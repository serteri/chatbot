'use client';
import { useSession } from "next-auth/react";

export default function IfRole({ role, children }: { role: "ADMIN" | "USER", children: React.ReactNode }) {
    const { data } = useSession();
    if (!data?.user?.role) return null;
    return data.user.role === role ? <>{children}</> : null;
}
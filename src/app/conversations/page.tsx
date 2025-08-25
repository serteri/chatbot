import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/signin");

    const list = await prisma.conversation.findMany({
        where: { userId: session.user.id },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Konuşmalar</h1>

            {!list.length && <div className="opacity-60">Henüz konuşma yok.</div>}

            <ul className="space-y-2">
                {list.map((c) => (
                    <li key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                            <div className="font-medium">{c.title || "(Başlıksız)"}</div>
                            <div className="text-xs opacity-60">{new Date(c.createdAt).toLocaleString("tr-TR")}</div>
                        </div>
                        <Link href={`/conversations/${c.id}`} className="btn btn-sm btn-primary">
                            Aç
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

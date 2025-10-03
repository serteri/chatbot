import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from 'next-intl/link'
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/signin");

    const rows = await prisma.conversation.findMany({
        where: { userId: session.user.id },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold">Konuşmalar</h1>

            {rows.length === 0 ? (
                <div className="text-center p-8 bg-base-200 rounded-lg">
                    <p>Henüz bir sohbet geçmişiniz bulunmuyor.</p>
                    <div className="mt-4 space-x-2">
                        <Link href="/dashboard/settings" className="btn btn-outline btn-sm">
                            ➕ Yeni Chatbot Oluştur
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.map((c) => (
                        <Link href={`/conversations/${c.id}`} key={c.id} className="block">
                            <div className="card bg-base-100 shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
                                <div className="card-body p-4">
                                    <h2 className="card-title text-lg">{c.title}</h2>
                                    <p className="text-sm opacity-60">
                                        {new Date(c.createdAt).toLocaleString("tr-TR")}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

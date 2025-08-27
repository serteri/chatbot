

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";


export default async function ConversationPage({params,}: { params: { conversationId: string };
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/signin");

    const conv = await prisma.conversation.findUnique({
        where: { id: params.conversationId, userId: session.user.id },
        select: { title: true, messages: true },
    });
    if (!conv) notFound();

    // Güvenli mesaj süzme
    const messages = Array.isArray(conv.messages)
        ? conv.messages.filter(
            (m: any) =>
                m &&
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string"
        )
        : [];

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">{conv.title}</h1>
            <div className="space-y-2">
                {messages.map((m: any, i: number) => (
                    <div
                        key={i}
                        className={`chat ${m.role === "user" ? "chat-end" : "chat-start"}`}
                    >
                        <div
                            className={`chat-bubble ${
                                m.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary"
                            }`}
                        >
                            {m.content}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
// src/app/conversations/[conversationId]/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConversationPage(props: any) {
    // İmzayı tiplemiyoruz, destructuring yapmıyoruz
    const params = (props as any)?.params;
    const conversationId = typeof params?.conversationId === "string" ? params.conversationId : "";

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/signin");
    if (!conversationId) notFound();

    const conv = await prisma.conversation.findUnique({
        where: { id: conversationId, userId: session.user.id },
        select: { title: true, messages: true },
    });
    if (!conv) notFound();

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

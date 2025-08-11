

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

interface PageProps {
    params: { conversationId: string };
}
interface Message {
    role: "user" | "assistant";
    content: string;
}

// Runtime tipi garanti eden fonksiyon
function isMessage(obj: any): obj is Message {
    return (
        obj &&
        (obj.role === "user" || obj.role === "assistant") &&
        typeof obj.content === "string"
    );
}

export default async function ConversationPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/signin");

    const conv = await prisma.conversation.findUnique({
        where: { id: params.conversationId, userId: session.user.id },
        select: { title: true, messages: true },
    });
    if (!conv) notFound();

    // 1) Raw JSON’u al
    const raw = conv.messages;
    // 2) Eğer dizi değilse boş dizi kullan
    const rawArr: unknown[] = Array.isArray(raw) ? raw : [];

    // 3) For-of ile Message’ları ayıkla
    const messages: Message[] = [];
    for (const item of rawArr) {
        if (isMessage(item)) {
            messages.push(item);
        }
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">{conv.title}</h1>
            <div className="space-y-2">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`chat ${m.role === "user" ? "chat-end" : "chat-start"}`}
                    >
                        <div
                            className={`chat-bubble ${
                                m.role === "user"
                                    ? "chat-bubble-primary"
                                    : "chat-bubble-secondary"
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
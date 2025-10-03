// src/lib/bots.ts
import prisma from "@/lib/prisma";

export async function resolveChatbotIdForUser(userId: string, orgId?: string | null) {
    const bot = await prisma.chatbot.findFirst({
        where: { userId, ...(orgId ? { organizationId: orgId } : {}) },
        orderBy: { updatedAt: "desc" }, // son kullanılan/güncellenen
        select: { id: true },
    });
    return bot?.id || null;
}

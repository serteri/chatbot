import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminBotsTable from "@/components/AdminBotsTable";
import AdminDocuments from "@/components/AdminDocuments";
import AdminConversations from "@/components/AdminConversations";
export default async function AdminPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/signin");
    if (session.user.role !== "ADMIN") redirect("/"); // veya notFound()

    const orgId = session.user.organizationId;

    const [botCount, docCount, convCount] = await Promise.all([
        prisma.chatbot.count({ where: { organizationId: orgId } }),
        prisma.document.count({ where: { chatbot: { organizationId: orgId } } }),
        prisma.conversation.count({ where: { chatbot: { organizationId: orgId } } }),
    ]);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Admin</h1>

            <div className="stats shadow">
                <div className="stat">
                    <div className="stat-title">Chatbot</div>
                    <div className="stat-value">{botCount}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Belge</div>
                    <div className="stat-value">{docCount}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Konuşma</div>
                    <div className="stat-value">{convCount}</div>
                </div>
            </div>

            <AdminBotsTable />
            <AdminDocuments />
            <AdminConversations />
        </div>
    );
}
-- AlterTable
ALTER TABLE "public"."Chatbot" ADD COLUMN     "embedAllowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retentionDays" INTEGER,
ADD COLUMN     "storeConversations" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."PublicConversation" (
    "id" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "organizationId" TEXT,
    "visitorId" TEXT,
    "externalUserId" TEXT,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicConversation_chatbotId_createdAt_idx" ON "public"."PublicConversation"("chatbotId", "createdAt");

-- CreateIndex
CREATE INDEX "Chatbot_userId_organizationId_idx" ON "public"."Chatbot"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Chatbot_organizationId_isPublic_idx" ON "public"."Chatbot"("organizationId", "isPublic");

-- CreateIndex
CREATE INDEX "Chatbot_createdAt_idx" ON "public"."Chatbot"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."PublicConversation" ADD CONSTRAINT "PublicConversation_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "public"."Chatbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

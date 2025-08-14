-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "chunkCount" INTEGER,
ADD COLUMN     "chunkIndex" INTEGER,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "mimeType" TEXT;

-- CreateIndex
CREATE INDEX "Document_userId_chatbotId_fileName_idx" ON "Document"("userId", "chatbotId", "fileName");

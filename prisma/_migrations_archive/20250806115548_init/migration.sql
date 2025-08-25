/*
  Warnings:

  - Made the column `chatbotId` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PromptMode" AS ENUM ('STRICT', 'FLEXIBLE');

-- AlterTable
ALTER TABLE "Chatbot" ADD COLUMN     "mode" "PromptMode" NOT NULL DEFAULT 'STRICT';

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "chatbotId" SET NOT NULL;

-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'ENTERPRISE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

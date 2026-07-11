-- CreateEnum
CREATE TYPE "PushLogStatus" AS ENUM ('QUEUED', 'SCHEDULED', 'SENT', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "data" JSONB,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "route" TEXT;

-- CreateTable
CREATE TABLE "push_logs" (
    "id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "userId" TEXT,
    "topic" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "route" TEXT,
    "data" JSONB,
    "silent" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3),
    "status" "PushLogStatus" NOT NULL DEFAULT 'QUEUED',
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "sentById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_logs_createdAt_idx" ON "push_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "push_logs" ADD CONSTRAINT "push_logs_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

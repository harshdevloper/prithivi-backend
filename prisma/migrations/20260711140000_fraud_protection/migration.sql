-- CreateEnum
CREATE TYPE "FraudEventType" AS ENUM ('DUPLICATE_IMAGE', 'DAILY_LIMIT', 'EXCESS_PENDING', 'MANUAL');

-- CreateTable
CREATE TABLE "submission_images" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submissionId" TEXT,
    "type" "FraudEventType" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_images_hash_idx" ON "submission_images"("hash");

-- CreateIndex
CREATE INDEX "submission_images_submissionId_createdAt_idx" ON "submission_images"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "fraud_logs_userId_createdAt_idx" ON "fraud_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "fraud_logs_createdAt_idx" ON "fraud_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "submission_images" ADD CONSTRAINT "submission_images_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "offer_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_logs" ADD CONSTRAINT "fraud_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_logs" ADD CONSTRAINT "fraud_logs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "offer_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

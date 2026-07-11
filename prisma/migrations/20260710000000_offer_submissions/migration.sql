-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "offer_submissions" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "screenshotUrl" TEXT NOT NULL,
    "note" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rewardAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offer_submissions_status_createdAt_idx" ON "offer_submissions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "offer_submissions_userId_idx" ON "offer_submissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "offer_submissions_offerId_userId_key" ON "offer_submissions"("offerId", "userId");

-- AddForeignKey
ALTER TABLE "offer_submissions" ADD CONSTRAINT "offer_submissions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_submissions" ADD CONSTRAINT "offer_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_submissions" ADD CONSTRAINT "offer_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

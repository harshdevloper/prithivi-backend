-- CreateEnum
CREATE TYPE "CpxStatus" AS ENUM ('COMPLETED', 'REVERSED');

-- CreateTable
CREATE TABLE "cpx_transactions" (
    "id" TEXT NOT NULL,
    "transId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CpxStatus" NOT NULL,
    "coins" DECIMAL(12,2) NOT NULL,
    "amountUsd" DECIMAL(12,4),
    "offerId" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpx_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cpx_transactions_transId_key" ON "cpx_transactions"("transId");

-- CreateIndex
CREATE INDEX "cpx_transactions_userId_createdAt_idx" ON "cpx_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "cpx_transactions_createdAt_idx" ON "cpx_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "cpx_transactions" ADD CONSTRAINT "cpx_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


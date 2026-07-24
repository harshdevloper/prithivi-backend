-- CreateEnum
CREATE TYPE "CoinPurchaseStatus" AS ENUM ('CREATED', 'CAPTURED');

-- CreateTable
CREATE TABLE "coin_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "coins" INTEGER NOT NULL,
    "packCount" INTEGER NOT NULL,
    "status" "CoinPurchaseStatus" NOT NULL DEFAULT 'CREATED',
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_purchases_razorpayOrderId_key" ON "coin_purchases"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "coin_purchases_razorpayPaymentId_key" ON "coin_purchases"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "coin_purchases_userId_createdAt_idx" ON "coin_purchases"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "coin_purchases" ADD CONSTRAINT "coin_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

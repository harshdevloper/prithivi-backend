-- CreateEnum
CREATE TYPE "OfferDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable: reward-system fields on offers (all additive / defaulted)
ALTER TABLE "offers" ADD COLUMN "rewardCoins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "offers" ADD COLUMN "taskDescription" TEXT;
ALTER TABLE "offers" ADD COLUMN "difficulty" "OfferDifficulty" NOT NULL DEFAULT 'EASY';
ALTER TABLE "offers" ADD COLUMN "trending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "offers" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "offers" ADD COLUMN "maxUsers" INTEGER;
ALTER TABLE "offers" ADD COLUMN "maxRewards" INTEGER;
ALTER TABLE "offers" ADD COLUMN "dailyLimit" INTEGER;

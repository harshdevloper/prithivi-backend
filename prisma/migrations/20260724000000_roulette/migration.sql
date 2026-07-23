-- CreateEnum
CREATE TYPE "RouletteBetType" AS ENUM ('ODD', 'EVEN', 'RED', 'BLACK', 'NUMBER');

-- CreateEnum
CREATE TYPE "RouletteRoundStatus" AS ENUM ('SETTLED', 'VOID');

-- CreateEnum
CREATE TYPE "RouletteProbabilityMode" AS ENUM ('FAIR', 'WEIGHTED');

-- CreateTable
CREATE TABLE "roulette_probability_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "RouletteProbabilityMode" NOT NULL DEFAULT 'WEIGHTED',
    "numberWeights" JSONB NOT NULL,
    "estimatedRtp" DECIMAL(6,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roulette_probability_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roulette_rounds" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "betType" "RouletteBetType" NOT NULL,
    "selectedNumber" INTEGER,
    "betAmount" DECIMAL(12,2) NOT NULL,
    "usedFreeGame" BOOLEAN NOT NULL DEFAULT false,
    "winningNumber" INTEGER NOT NULL,
    "winningColour" TEXT NOT NULL,
    "parity" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "payoutMultiplier" INTEGER NOT NULL,
    "payoutAmount" DECIMAL(12,2) NOT NULL,
    "netResult" DECIMAL(12,2) NOT NULL,
    "status" "RouletteRoundStatus" NOT NULL DEFAULT 'SETTLED',
    "probabilityMode" "RouletteProbabilityMode" NOT NULL,
    "configSnapshot" JSONB NOT NULL,
    "probabilityProfileId" TEXT,
    "serverSeed" TEXT NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "roulette_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roulette_probability_profiles_active_idx" ON "roulette_probability_profiles"("active");

-- CreateIndex
CREATE INDEX "roulette_rounds_userId_createdAt_idx" ON "roulette_rounds"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "roulette_rounds_createdAt_idx" ON "roulette_rounds"("createdAt");

-- CreateIndex
CREATE INDEX "roulette_rounds_winningNumber_idx" ON "roulette_rounds"("winningNumber");

-- CreateIndex
CREATE INDEX "roulette_rounds_betType_idx" ON "roulette_rounds"("betType");

-- CreateIndex
CREATE INDEX "roulette_rounds_probabilityProfileId_idx" ON "roulette_rounds"("probabilityProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "roulette_rounds_userId_idempotencyKey_key" ON "roulette_rounds"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "roulette_rounds" ADD CONSTRAINT "roulette_rounds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roulette_rounds" ADD CONSTRAINT "roulette_rounds_probabilityProfileId_fkey" FOREIGN KEY ("probabilityProfileId") REFERENCES "roulette_probability_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

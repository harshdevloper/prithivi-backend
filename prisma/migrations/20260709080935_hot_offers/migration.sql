-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OfferEventType" AS ENUM ('VIEW', 'CLICK', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "OfferEventSource" AS ENUM ('APP', 'WEBSITE');

-- CreateTable
CREATE TABLE "offer_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "offer_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_pages" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "benefits" JSONB,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "buttonText" TEXT NOT NULL DEFAULT 'Download',
    "buttonVisible" BOOLEAN NOT NULL DEFAULT true,
    "websiteUrl" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "feedback_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "appName" TEXT,
    "logoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "bannerUrl" TEXT,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" JSONB,
    "instructions" JSONB,
    "requirements" JSONB,
    "terms" TEXT,
    "warning" TEXT,
    "rewardAmount" DECIMAL(12,2) NOT NULL,
    "rewardLabel" TEXT,
    "estimatedTime" TEXT,
    "rating" DECIMAL(2,1),
    "playStoreUrl" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_events" (
    "id" TEXT NOT NULL,
    "offerId" TEXT,
    "categoryId" TEXT,
    "type" "OfferEventType" NOT NULL,
    "source" "OfferEventSource" NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offer_categories_slug_key" ON "offer_categories"("slug");

-- CreateIndex
CREATE INDEX "offer_categories_status_priority_idx" ON "offer_categories"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_pages_categoryId_key" ON "feedback_pages"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "offers_slug_key" ON "offers"("slug");

-- CreateIndex
CREATE INDEX "offers_categoryId_status_priority_idx" ON "offers"("categoryId", "status", "priority");

-- CreateIndex
CREATE INDEX "offers_status_featured_idx" ON "offers"("status", "featured");

-- CreateIndex
CREATE INDEX "offer_events_offerId_type_createdAt_idx" ON "offer_events"("offerId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "offer_events_categoryId_type_createdAt_idx" ON "offer_events"("categoryId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "offer_events_createdAt_idx" ON "offer_events"("createdAt");

-- AddForeignKey
ALTER TABLE "feedback_pages" ADD CONSTRAINT "feedback_pages_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "offer_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "offer_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_events" ADD CONSTRAINT "offer_events_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_events" ADD CONSTRAINT "offer_events_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "offer_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

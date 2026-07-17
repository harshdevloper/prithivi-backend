-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "isProduct" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "brandLogoUrl" TEXT;

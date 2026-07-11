-- AlterTable
ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "routeVariant" TEXT NOT NULL DEFAULT 'full';

-- AlterTable
ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER;
ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "collageGeneratedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScavengerHuntCompletion" (
    "id" TEXT NOT NULL,
    "dogProfileId" TEXT NOT NULL,
    "huntSlug" TEXT NOT NULL,
    "routeVariant" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "submissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScavengerHuntCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScavengerHuntCompletion_huntSlug_routeVariant_durationSeconds_idx" ON "ScavengerHuntCompletion"("huntSlug", "routeVariant", "durationSeconds");
CREATE INDEX IF NOT EXISTS "ScavengerHuntCompletion_dogProfileId_completedAt_idx" ON "ScavengerHuntCompletion"("dogProfileId", "completedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ScavengerHuntCompletion" ADD CONSTRAINT "ScavengerHuntCompletion_dogProfileId_fkey" FOREIGN KEY ("dogProfileId") REFERENCES "DogProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "ScavengerHuntProgress" (
    "id" TEXT NOT NULL,
    "dogProfileId" TEXT NOT NULL,
    "huntSlug" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScavengerHuntProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScavengerHuntSubmission" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "checkpointIndex" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScavengerHuntSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScavengerHuntProgress_dogProfileId_idx" ON "ScavengerHuntProgress"("dogProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ScavengerHuntProgress_dogProfileId_huntSlug_key" ON "ScavengerHuntProgress"("dogProfileId", "huntSlug");

-- CreateIndex
CREATE INDEX "ScavengerHuntSubmission_progressId_idx" ON "ScavengerHuntSubmission"("progressId");

-- CreateIndex
CREATE UNIQUE INDEX "ScavengerHuntSubmission_progressId_checkpointIndex_key" ON "ScavengerHuntSubmission"("progressId", "checkpointIndex");

-- AddForeignKey
ALTER TABLE "ScavengerHuntProgress" ADD CONSTRAINT "ScavengerHuntProgress_dogProfileId_fkey" FOREIGN KEY ("dogProfileId") REFERENCES "DogProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScavengerHuntSubmission" ADD CONSTRAINT "ScavengerHuntSubmission_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "ScavengerHuntProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

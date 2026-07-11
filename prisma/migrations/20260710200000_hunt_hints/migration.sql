-- CreateEnum
CREATE TYPE "HuntHintSource" AS ENUM ('FREE', 'PAID');

-- AlterTable
ALTER TABLE "ScavengerHuntProgress" ADD COLUMN "freeHintUsed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ScavengerHuntHintReveal" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "checkpointIndex" INTEGER NOT NULL,
    "source" "HuntHintSource" NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScavengerHuntHintReveal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScavengerHuntHintPurchase" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "checkpointIndex" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "amountEur" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScavengerHuntHintPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScavengerHuntHintReveal_progressId_idx" ON "ScavengerHuntHintReveal"("progressId");

-- CreateIndex
CREATE UNIQUE INDEX "ScavengerHuntHintReveal_progressId_checkpointIndex_key" ON "ScavengerHuntHintReveal"("progressId", "checkpointIndex");

-- CreateIndex
CREATE INDEX "ScavengerHuntHintPurchase_progressId_orderId_idx" ON "ScavengerHuntHintPurchase"("progressId", "orderId");

-- CreateIndex
CREATE INDEX "ScavengerHuntHintPurchase_orderId_idx" ON "ScavengerHuntHintPurchase"("orderId");

-- AddForeignKey
ALTER TABLE "ScavengerHuntHintReveal" ADD CONSTRAINT "ScavengerHuntHintReveal_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "ScavengerHuntProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScavengerHuntHintPurchase" ADD CONSTRAINT "ScavengerHuntHintPurchase_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "ScavengerHuntProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

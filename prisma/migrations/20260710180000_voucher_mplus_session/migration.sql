-- AlterEnum
ALTER TYPE "VoucherStatus" ADD VALUE IF NOT EXISTS 'VALIDATED';

-- AlterTable
ALTER TABLE "RewardVoucher" ADD COLUMN IF NOT EXISTS "mplusDiscountId" TEXT;
ALTER TABLE "RewardVoucher" ADD COLUMN IF NOT EXISTS "mplusSessionId" TEXT;
ALTER TABLE "RewardVoucher" ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RewardVoucher_mplusDiscountId_key" ON "RewardVoucher"("mplusDiscountId");
CREATE INDEX IF NOT EXISTS "RewardVoucher_mplusSessionId_idx" ON "RewardVoucher"("mplusSessionId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "MplusSessionContext" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dogProfileId" TEXT NOT NULL,
    "voucherId" TEXT,
    "rewardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MplusSessionContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MplusSessionContext_sessionId_key" ON "MplusSessionContext"("sessionId");
CREATE INDEX IF NOT EXISTS "MplusSessionContext_expiresAt_idx" ON "MplusSessionContext"("expiresAt");

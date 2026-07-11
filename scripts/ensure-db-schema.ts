import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addEnumValue(typeName: string, value: string) {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TYPE "${typeName}" ADD VALUE '${value}';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

async function ensureEnumType(typeName: string, values: string[]) {
  const labels = values.map((v) => `'${v}'`).join(", ");
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "${typeName}" AS ENUM (${labels});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

async function main() {
  await addEnumValue("AchievementRuleType", "WOOF_COINS");
  await addEnumValue("AchievementRuleType", "BIRTHDAY_CHECK_IN");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "mplusSessionId" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ReceiptItem" ADD COLUMN IF NOT EXISTS "articleNumber" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_barcode_key"
    ON "Receipt"("barcode");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_mplusSessionId_key"
    ON "Receipt"("mplusSessionId");
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mplusRelationNumber" INTEGER;
  `);

  await addEnumValue("VoucherStatus", "VALIDATED");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "RewardVoucher" ADD COLUMN IF NOT EXISTS "mplusDiscountId" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "RewardVoucher" ADD COLUMN IF NOT EXISTS "mplusSessionId" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "RewardVoucher" ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "RewardVoucher_mplusDiscountId_key"
    ON "RewardVoucher"("mplusDiscountId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RewardVoucher_mplusSessionId_idx"
    ON "RewardVoucher"("mplusSessionId");
  `);
  await prisma.$executeRawUnsafe(`
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
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "MplusSessionContext_sessionId_key"
    ON "MplusSessionContext"("sessionId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MplusSessionContext_expiresAt_idx"
    ON "MplusSessionContext"("expiresAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ScavengerHuntProgress" (
      "id" TEXT NOT NULL,
      "dogProfileId" TEXT NOT NULL,
      "huntSlug" TEXT NOT NULL,
      "currentStep" INTEGER NOT NULL DEFAULT 0,
      "freeHintUsed" BOOLEAN NOT NULL DEFAULT false,
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScavengerHuntProgress_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "freeHintUsed" BOOLEAN NOT NULL DEFAULT false;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "routeVariant" TEXT NOT NULL DEFAULT 'full';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ScavengerHuntProgress" ADD COLUMN IF NOT EXISTS "collageGeneratedAt" TIMESTAMP(3);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ScavengerHuntSubmission" (
      "id" TEXT NOT NULL,
      "progressId" TEXT NOT NULL,
      "checkpointIndex" INTEGER NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "lat" DOUBLE PRECISION NOT NULL,
      "lng" DOUBLE PRECISION NOT NULL,
      "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScavengerHuntSubmission_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ScavengerHuntProgress_dogProfileId_huntSlug_key"
    ON "ScavengerHuntProgress"("dogProfileId", "huntSlug");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ScavengerHuntProgress_dogProfileId_idx"
    ON "ScavengerHuntProgress"("dogProfileId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ScavengerHuntSubmission_progressId_checkpointIndex_key"
    ON "ScavengerHuntSubmission"("progressId", "checkpointIndex");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ScavengerHuntSubmission_progressId_idx"
    ON "ScavengerHuntSubmission"("progressId");
  `);

  await ensureEnumType("HuntHintSource", ["FREE", "PAID"]);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ScavengerHuntHintReveal" (
      "id" TEXT NOT NULL,
      "progressId" TEXT NOT NULL,
      "checkpointIndex" INTEGER NOT NULL,
      "source" "HuntHintSource" NOT NULL,
      "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScavengerHuntHintReveal_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ScavengerHuntHintReveal_progressId_checkpointIndex_key"
    ON "ScavengerHuntHintReveal"("progressId", "checkpointIndex");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ScavengerHuntHintReveal_progressId_idx"
    ON "ScavengerHuntHintReveal"("progressId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ScavengerHuntHintPurchase" (
      "id" TEXT NOT NULL,
      "progressId" TEXT NOT NULL,
      "checkpointIndex" INTEGER NOT NULL,
      "orderId" INTEGER NOT NULL,
      "amountEur" DECIMAL(10,2) NOT NULL,
      "paidAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScavengerHuntHintPurchase_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ScavengerHuntHintPurchase_progressId_orderId_idx"
    ON "ScavengerHuntHintPurchase"("progressId", "orderId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ScavengerHuntHintPurchase_orderId_idx"
    ON "ScavengerHuntHintPurchase"("orderId");
  `);

  await prisma.$executeRawUnsafe(`
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
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ScavengerHuntCompletion_huntSlug_routeVariant_durationSeconds_idx"
    ON "ScavengerHuntCompletion"("huntSlug", "routeVariant", "durationSeconds");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ScavengerHuntCompletion_dogProfileId_completedAt_idx"
    ON "ScavengerHuntCompletion"("dogProfileId", "completedAt");
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "WoofWalletLink" ADD COLUMN IF NOT EXISTS "lastKnownBalanceEur" DECIMAL(10,2);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "WoofWalletLink" ADD COLUMN IF NOT EXISTS "lastBalanceFetchedAt" TIMESTAMP(3);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "WoofWalletLink" ADD COLUMN IF NOT EXISTS "balanceConfirmedAt" TIMESTAMP(3);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TopUp" ADD COLUMN IF NOT EXISTS "wooOrderId" INTEGER;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "TopUp_wooOrderId_key"
    ON "TopUp"("wooOrderId");
  `);
}

main()
  .then(() => {
    console.log("Database schema ensured");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

-- AlterTable
ALTER TABLE "WoofWalletLink" ADD COLUMN "lastKnownBalanceEur" DECIMAL(10,2);
ALTER TABLE "WoofWalletLink" ADD COLUMN "lastBalanceFetchedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TopUp" ADD COLUMN "wooOrderId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "TopUp_wooOrderId_key" ON "TopUp"("wooOrderId");

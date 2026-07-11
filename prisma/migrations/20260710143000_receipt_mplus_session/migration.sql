-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN "mplusSessionId" TEXT;

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN "articleNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_mplusSessionId_key" ON "Receipt"("mplusSessionId");

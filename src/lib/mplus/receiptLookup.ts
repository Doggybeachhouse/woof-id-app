export type { MplusReceiptLine } from "@/lib/mplus/receipts";

export type MplusReceiptResult = {
  barcode: string;
  totalEur: number;
  lines: import("@/lib/mplus/receipts").MplusReceiptLine[];
};

import { isMplusConfigured } from "@/lib/mplus/config";
import { lookupReceiptByBarcode as lookupReceipt } from "@/lib/mplus/receipts";

/** STN/Mplus API — returns null when credentials are missing or receipt not found. */
export async function lookupReceiptByBarcode(
  barcode: string,
): Promise<MplusReceiptResult | null> {
  if (!isMplusConfigured()) {
    return null;
  }

  const receipt = await lookupReceipt(barcode);
  if (!receipt) return null;

  return {
    barcode: receipt.barcode,
    totalEur: receipt.totalEur,
    lines: receipt.lines,
  };
}

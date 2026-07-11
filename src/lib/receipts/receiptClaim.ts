import type { Receipt } from "@prisma/client";
import { CoinSourceType } from "@prisma/client";

import { processDogEvent } from "@/lib/gamification/processDogEvent";
import { coinsFromPurchaseEur } from "@/lib/gamification/receiptCoins";
import { prisma } from "@/lib/prisma";

import { RECEIPT_ERROR } from "./errors";

export function receiptResumePath(receiptId: string, hasItems: boolean): string {
  const base = hasItems
    ? `/receipts/${receiptId}/review`
    : `/receipts/${receiptId}/pending`;
  return `${base}?resumed=1`;
}

export async function getReceiptCoinsAwarded(receiptId: string): Promise<number> {
  const entry = await prisma.coinLedger.findFirst({
    where: { sourceType: CoinSourceType.RECEIPT, sourceId: receiptId },
    select: { amount: true },
  });
  return entry?.amount ?? 0;
}

export type ExistingReceiptResolution =
  | { action: "redirect"; path: string }
  | {
      action: "error";
      code:
        | typeof RECEIPT_ERROR.DUPLICATE
        | typeof RECEIPT_ERROR.ALREADY_CLAIMED;
      coins?: number;
    };

type ExistingReceipt = Receipt & { items: { id: string }[] };

export async function resolveExistingBarcodeReceipt(
  existing: ExistingReceipt,
  dogProfileId: string,
  dogName: string,
): Promise<ExistingReceiptResolution> {
  if (existing.dogProfileId !== dogProfileId) {
    return { action: "error", code: RECEIPT_ERROR.DUPLICATE };
  }

  if (existing.status === "PENDING") {
    return {
      action: "redirect",
      path: receiptResumePath(existing.id, existing.items.length > 0),
    };
  }

  const coinsAwarded = await getReceiptCoinsAwarded(existing.id);
  if (coinsAwarded > 0) {
    return {
      action: "error",
      code: RECEIPT_ERROR.ALREADY_CLAIMED,
      coins: coinsAwarded,
    };
  }

  const purchaseEur =
    existing.totalEur != null ? Number(existing.totalEur) : 0;
  await processDogEvent({
    dogProfileId: existing.dogProfileId,
    eventType: "RECEIPT_CONFIRMED",
    payload: {
      receiptId: existing.id,
      purchaseAmountEur: purchaseEur,
    },
  });
  const coins = coinsFromPurchaseEur(purchaseEur);
  return {
    action: "redirect",
    path: `/receipts/${existing.id}/success?coins=${coins}&total=${purchaseEur.toFixed(2)}&dog=${encodeURIComponent(dogName)}&fixed=1`,
  };
}

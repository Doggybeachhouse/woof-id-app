import { isMplusConfigured } from "@/lib/mplus/config";
import {
  getGiftcardHistory,
  type MplusGiftcardHistoryEntry,
} from "@/lib/mplus/giftcard";
import { lookupReceiptByBarcode } from "@/lib/mplus/receiptLookup";
import { lookupReceiptByDateAndAmount } from "@/lib/mplus/receipts";
import {
  buildWalletPurchaseItems,
  recordWalletPurchase,
  type WalletPurchaseLineSource,
} from "@/lib/mplus/walletPurchaseRecord";

export type SyncWalletPurchasesResult = {
  scanned: number;
  purchases: number;
  processed: number;
  skipped: number;
  duplicates: number;
};

function parseHistoryTimestamp(entry: MplusGiftcardHistoryEntry): Date | null {
  const raw = entry.dateTime ?? entry.bookDate;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

export function isWalletPurchaseEntry(entry: MplusGiftcardHistoryEntry): boolean {
  if (entry.bookingAmountCents >= 0) return false;
  if (/fail|cancel|reject|error|declin/i.test(entry.result)) return false;
  return true;
}

export function walletHistorySessionId(
  walletCardId: string,
  entry: MplusGiftcardHistoryEntry,
): string {
  const externalReference = entry.externalReference?.trim();
  if (externalReference && externalReference.length >= 4) {
    return externalReference;
  }

  const when = entry.dateTime ?? entry.bookDate ?? "unknown";
  const amount = Math.abs(entry.bookingAmountCents);
  return `wallet-history:${walletCardId}:${when}:${amount}`;
}

async function resolvePurchaseDetails(
  entry: MplusGiftcardHistoryEntry,
): Promise<{ totalEur: number; lines: WalletPurchaseLineSource[] | null }> {
  const purchaseTotalEur = Math.abs(entry.bookingAmountEur);
  const externalReference = entry.externalReference?.trim();

  if (externalReference && externalReference.length >= 4) {
    const receipt = await lookupReceiptByBarcode(externalReference);
    if (receipt && receipt.lines.length > 0) {
      return {
        totalEur: receipt.totalEur > 0 ? receipt.totalEur : purchaseTotalEur,
        lines: receipt.lines,
      };
    }
  }

  const when = parseHistoryTimestamp(entry);
  if (when) {
    const receipt = await lookupReceiptByDateAndAmount(when, purchaseTotalEur);
    if (receipt && receipt.lines.length > 0) {
      return {
        totalEur: receipt.totalEur > 0 ? receipt.totalEur : purchaseTotalEur,
        lines: receipt.lines,
      };
    }
  }

  return { totalEur: purchaseTotalEur, lines: null };
}

export async function syncWalletPurchasesForDog(
  dogProfileId: string,
  walletCardId: string,
): Promise<SyncWalletPurchasesResult> {
  const result: SyncWalletPurchasesResult = {
    scanned: 0,
    purchases: 0,
    processed: 0,
    skipped: 0,
    duplicates: 0,
  };

  if (!isMplusConfigured()) {
    return result;
  }

  const cardNumber = walletCardId.trim();
  if (!cardNumber) {
    return result;
  }

  let history: MplusGiftcardHistoryEntry[];
  try {
    history = await getGiftcardHistory(cardNumber);
  } catch (error) {
    console.error("[mplus/sync] getGiftcardHistory failed", {
      dogProfileId,
      walletCardId: cardNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }

  result.scanned = history.length;

  for (const entry of history) {
    if (!isWalletPurchaseEntry(entry)) {
      continue;
    }

    result.purchases += 1;

    const mplusSessionId = walletHistorySessionId(cardNumber, entry);
    const confirmedAt = parseHistoryTimestamp(entry) ?? new Date();
    const { totalEur, lines } = await resolvePurchaseDetails(entry);

    if (totalEur <= 0) {
      result.skipped += 1;
      continue;
    }

    try {
      const recorded = await recordWalletPurchase({
        dogProfileId,
        mplusSessionId,
        totalEur,
        confirmedAt,
        items: buildWalletPurchaseItems(lines, totalEur),
      });

      if (recorded.alreadyExists) {
        result.duplicates += 1;
      } else {
        result.processed += 1;
        console.info("[mplus/sync] wallet purchase recorded", {
          dogProfileId,
          walletCardId: cardNumber,
          mplusSessionId,
          totalEur,
          receiptId: recorded.receiptId,
        });
      }
    } catch (error) {
      result.skipped += 1;
      console.error("[mplus/sync] wallet purchase record failed", {
        dogProfileId,
        walletCardId: cardNumber,
        mplusSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

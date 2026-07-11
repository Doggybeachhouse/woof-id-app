import type { ProductCategory } from "@prisma/client";

import { guessCategoryFromName } from "@/lib/catalog/products";
import { processDogEvent } from "@/lib/gamification/processDogEvent";
import { prisma } from "@/lib/prisma";

export type WalletPurchaseLineInput = {
  articleNumber: string | null;
  rawName: string;
  normalizedName: string;
  quantity: number;
  category: ProductCategory;
  unitPriceEur: number | null;
};

export type WalletPurchaseLineSource = {
  name: string;
  quantity: number;
  articleNumber?: string;
  unitPriceEur?: number | null;
};

export function buildWalletPurchaseItems(
  lines: WalletPurchaseLineSource[] | null,
  purchaseTotalEur: number,
): WalletPurchaseLineInput[] {
  if (lines && lines.length > 0) {
    return lines.map((line) => {
      const name = line.name.trim() || "Onbekend product";
      return {
        articleNumber: line.articleNumber ?? null,
        rawName: name,
        normalizedName: name,
        quantity: Math.max(1, Math.round(line.quantity)),
        category: guessCategoryFromName(name),
        unitPriceEur: line.unitPriceEur ?? null,
      };
    });
  }

  return [
    {
      articleNumber: null,
      rawName: "Woof Wallet aankoop",
      normalizedName: "Woof Wallet aankoop",
      quantity: 1,
      category: guessCategoryFromName("aankoop"),
      unitPriceEur: purchaseTotalEur > 0 ? purchaseTotalEur : null,
    },
  ];
}

export async function recordWalletPurchase(input: {
  dogProfileId: string;
  mplusSessionId: string;
  totalEur: number;
  confirmedAt: Date;
  items: WalletPurchaseLineInput[];
}): Promise<{ receiptId: string; alreadyExists: boolean }> {
  const existing = await prisma.receipt.findUnique({
    where: { mplusSessionId: input.mplusSessionId },
    select: { id: true },
  });
  if (existing) {
    return { receiptId: existing.id, alreadyExists: true };
  }

  const receipt = await prisma.$transaction(async (tx) => {
    return tx.receipt.create({
      data: {
        dogProfileId: input.dogProfileId,
        mplusSessionId: input.mplusSessionId,
        status: "CONFIRMED",
        totalEur: input.totalEur,
        confirmedAt: input.confirmedAt,
        items: {
          create: input.items,
        },
      },
    });
  });

  await processDogEvent({
    dogProfileId: input.dogProfileId,
    eventType: "RECEIPT_CONFIRMED",
    payload: {
      receiptId: receipt.id,
      purchaseAmountEur: input.totalEur,
    },
  });

  return { receiptId: receipt.id, alreadyExists: false };
}

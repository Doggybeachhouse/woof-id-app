import type { ProductCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type FavoriteProduct = {
  normalizedName: string;
  totalQuantity: number;
  purchaseCount: number;
  lastPurchasedAt: Date;
  articleNumber: string | null;
  category: ProductCategory;
};

export async function getFavoriteProducts(
  dogProfileId: string,
  limit = 5,
): Promise<FavoriteProduct[]> {
  const items = await prisma.receiptItem.findMany({
    where: {
      receipt: {
        dogProfileId,
        status: "CONFIRMED",
      },
    },
    select: {
      normalizedName: true,
      quantity: true,
      articleNumber: true,
      category: true,
      receipt: {
        select: {
          confirmedAt: true,
          scannedAt: true,
        },
      },
    },
  });

  const grouped = new Map<
    string,
    {
      totalQuantity: number;
      purchaseCount: number;
      lastPurchasedAt: Date;
      articleNumber: string | null;
      category: ProductCategory;
    }
  >();

  for (const item of items) {
    const name = item.normalizedName.trim();
    if (!name) continue;

    const purchasedAt =
      item.receipt.confirmedAt ?? item.receipt.scannedAt ?? new Date();
    const existing = grouped.get(name);

    if (!existing) {
      grouped.set(name, {
        totalQuantity: item.quantity,
        purchaseCount: 1,
        lastPurchasedAt: purchasedAt,
        articleNumber: item.articleNumber,
        category: item.category,
      });
      continue;
    }

    existing.totalQuantity += item.quantity;
    existing.purchaseCount += 1;
    if (purchasedAt > existing.lastPurchasedAt) {
      existing.lastPurchasedAt = purchasedAt;
      existing.articleNumber = item.articleNumber;
      existing.category = item.category;
    }
  }

  return [...grouped.entries()]
    .map(([normalizedName, stats]) => ({
      normalizedName,
      ...stats,
    }))
    .sort((a, b) => {
      if (b.totalQuantity !== a.totalQuantity) {
        return b.totalQuantity - a.totalQuantity;
      }
      return b.lastPurchasedAt.getTime() - a.lastPurchasedAt.getTime();
    })
    .slice(0, limit);
}

export async function getRecentPurchaseItems(
  dogProfileId: string,
  limit = 5,
): Promise<
  Array<{
    normalizedName: string;
    quantity: number;
    purchasedAt: Date;
    totalEur: number | null;
    articleNumber: string | null;
    category: ProductCategory;
  }>
> {
  const receipts = await prisma.receipt.findMany({
    where: {
      dogProfileId,
      status: "CONFIRMED",
    },
    orderBy: [{ confirmedAt: "desc" }, { scannedAt: "desc" }],
    take: 3,
    include: {
      items: {
        orderBy: { rawName: "asc" },
      },
    },
  });

  const recent: Array<{
    normalizedName: string;
    quantity: number;
    purchasedAt: Date;
    totalEur: number | null;
    articleNumber: string | null;
    category: ProductCategory;
  }> = [];

  for (const receipt of receipts) {
    const purchasedAt = receipt.confirmedAt ?? receipt.scannedAt;
    const totalEur =
      receipt.totalEur != null ? Number(receipt.totalEur) : null;

    for (const item of receipt.items) {
      recent.push({
        normalizedName: item.normalizedName,
        quantity: item.quantity,
        purchasedAt,
        totalEur,
        articleNumber: item.articleNumber,
        category: item.category,
      });
      if (recent.length >= limit) {
        return recent;
      }
    }
  }

  return recent;
}

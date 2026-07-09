import { loadProductCatalog } from "@/lib/catalog/products";

import { coinsFromPurchaseEur } from "./receiptCoins";

export { coinsFromPurchaseEur };

export type ReceiptLineForTotal = {
  normalizedName: string;
  quantity: number;
  unitPriceEur?: number | null;
};

function findCatalogPrice(normalizedName: string): number | null {
  const name = normalizedName.trim().toLowerCase();
  if (!name) return null;

  const catalog = loadProductCatalog();
  const exact = catalog.find((p) => p.name.toLowerCase() === name);
  if (exact?.priceEur != null) return exact.priceEur;

  const partial = catalog.find(
    (p) =>
      p.priceEur != null &&
      (p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase())),
  );
  return partial?.priceEur ?? null;
}

export function estimateReceiptTotalEur(items: ReceiptLineForTotal[]): number {
  return items.reduce((sum, item) => {
    const qty = Math.max(1, item.quantity);
    const unit =
      item.unitPriceEur != null && item.unitPriceEur > 0
        ? item.unitPriceEur
        : findCatalogPrice(item.normalizedName);
    if (unit == null || unit <= 0) return sum;
    return sum + unit * qty;
  }, 0);
}

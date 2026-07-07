import type { ReceiptItem } from "@prisma/client";

export const COIN_PER_PRODUCT_UNIT = 1;

export function sumProductUnits(
  items: Pick<ReceiptItem, "quantity">[],
): number {
  return items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
}

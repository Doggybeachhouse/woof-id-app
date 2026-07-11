import type { ProductCategory } from "@prisma/client";

const CATEGORY_EMOJI: Record<ProductCategory, string> = {
  LICKY: "🍦",
  SNACKS: "🦴",
  TOYS: "🎾",
  ACCESSORIES: "🦮",
  GROOMING: "🛁",
  CLOTHING: "👕",
  OTHER: "🛍️",
};

export function productCategoryEmoji(category: ProductCategory): string {
  return CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.OTHER;
}

/** Mplus artikelen.csv has no image URLs; extend here when a CDN pattern is available. */
export function resolveProductImageUrl(
  _articleNumber: string | null | undefined,
): string | null {
  return null;
}

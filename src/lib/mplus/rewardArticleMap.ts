export type RewardArticleRule = {
  /** Mplus article numbers that qualify for this reward voucher. */
  articleNumbers: string[];
  /** Percentage discount to apply (100 = free item). */
  discountPercentage: number;
  discountDescription: string;
};

/**
 * Maps Woof reward IDs to Mplus article numbers for automatic kassa discounts.
 * Article numbers from data/artikelen.csv (MplusQ export).
 */
export const REWARD_ARTICLE_MAP: Record<string, RewardArticleRule> = {
  "free-licky": {
    // Hondenijsje Bark & BRRR — Dog Bar / kassa zelf maken (Licky)
    articleNumbers: ["204"],
    discountPercentage: 100,
    discountDescription: "Woof ID — Gratis Licky",
  },
  "free-ball": {
    // TODO: confirm ball article numbers with DBH
    articleNumbers: [],
    discountPercentage: 100,
    discountDescription: "Woof ID — Gratis bal",
  },
  "discount-10": {
    // Session-level percentage — not article-specific (handled separately later)
    articleNumbers: [],
    discountPercentage: 10,
    discountDescription: "Woof ID — 10% korting",
  },
  "snack-bag": {
    // TODO: confirm snackbar article numbers with DBH
    articleNumbers: [],
    discountPercentage: 100,
    discountDescription: "Woof ID — Zak snacks",
  },
};

export function getRewardArticleRule(rewardId: string): RewardArticleRule | null {
  return REWARD_ARTICLE_MAP[rewardId] ?? null;
}

export function articleMatchesReward(
  rewardId: string,
  articleNumber: string | number | null | undefined,
): boolean {
  if (articleNumber == null) return false;
  const rule = getRewardArticleRule(rewardId);
  if (!rule || rule.articleNumbers.length === 0) return false;
  const normalized = String(articleNumber).trim();
  return rule.articleNumbers.includes(normalized);
}

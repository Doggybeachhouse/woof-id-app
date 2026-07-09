/** Woof Coins from purchase total: standard rounding (0.5 rounds up). */
export function coinsFromPurchaseEur(amountEur: number): number {
  if (!Number.isFinite(amountEur) || amountEur <= 0) return 0;
  return Math.round(amountEur);
}

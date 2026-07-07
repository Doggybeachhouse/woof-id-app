export const TOPUP_MIN_CENTS = 100;
export const TOPUP_MAX_CENTS = 50000;

export function parseTopUpAmountEurToCents(amount: string): number | null {
  const normalized = amount.trim().replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  return Math.round(parseFloat(normalized) * 100);
}

export function isValidTopUpAmountCents(cents: number): boolean {
  return cents >= TOPUP_MIN_CENTS && cents <= TOPUP_MAX_CENTS;
}

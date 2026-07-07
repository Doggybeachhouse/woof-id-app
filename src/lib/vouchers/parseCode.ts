export function parseVoucherCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  const match = trimmed.match(/WVH[A-F0-9]+/);
  return match ? match[0] : trimmed;
}

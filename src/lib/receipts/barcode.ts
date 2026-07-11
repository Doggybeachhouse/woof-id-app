import { prisma } from "@/lib/prisma";

export function normalizeReceiptBarcode(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function isNumericBarcode(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * Safe equivalents for comparing receipt barcodes.
 * Exact match plus EAN-13 leading-zero variants only — no arbitrary padding
 * or cross-length leading-zero stripping (those caused false duplicate matches).
 */
export function receiptBarcodeEquivalents(value: string): string[] {
  const normalized = normalizeReceiptBarcode(value);
  if (!normalized) return [];

  const out = new Set<string>([normalized]);

  if (!isNumericBarcode(normalized)) {
    const alnum = normalized.replace(/[^0-9A-Za-z]/g, "");
    if (alnum) out.add(alnum);
    return [...out];
  }

  const digits = normalized;
  // EAN-13: scanners often return 12 digits (leading zero omitted).
  if (digits.length === 12) {
    out.add(`0${digits}`);
  }
  if (digits.length === 13 && digits.startsWith("0")) {
    out.add(digits.slice(1));
  }

  return [...out];
}

export function receiptBarcodesMatch(a: string, b: string): boolean {
  const equivB = new Set(receiptBarcodeEquivalents(b));
  return receiptBarcodeEquivalents(a).some((candidate) => equivB.has(candidate));
}

/** @deprecated Prefer normalizeReceiptBarcode; kept for logging. */
export function canonicalReceiptBarcode(value: string): string {
  const normalized = normalizeReceiptBarcode(value);
  if (!normalized || !isNumericBarcode(normalized)) return normalized;
  return normalized.replace(/^0+/, "") || "0";
}

/** Find an existing receipt whose stored barcode matches the scanned value. */
export async function findExistingReceiptByBarcode(barcode: string) {
  const equivalents = receiptBarcodeEquivalents(barcode);
  if (equivalents.length === 0) return null;

  return prisma.receipt.findFirst({
    where: { barcode: { in: equivalents } },
    include: { items: { select: { id: true } } },
  });
}

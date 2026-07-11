import { createHmac, timingSafeEqual } from "node:crypto";

export function getMplusWebhookSecret(): string | null {
  const secret = process.env.MPLUS_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function signMplusPayload(rawBody: string, secretBase64: string): string {
  const key = Buffer.from(secretBase64, "base64");
  return createHmac("sha256", key).update(rawBody).digest("base64");
}

export function verifyMplusSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretBase64: string,
): boolean {
  if (!signatureHeader?.trim()) return false;

  const expected = signMplusPayload(rawBody, secretBase64);
  const received = signatureHeader.trim();
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

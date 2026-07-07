import { createHmac, timingSafeEqual } from "crypto";

export const CHECKIN_TIMEZONE = "Europe/Amsterdam";

/** Minutes each store QR stays valid (also rotates on tablet). */
export function getCheckInQrIntervalMinutes() {
  const raw = Number(process.env.CHECKIN_QR_INTERVAL_MINUTES ?? 15);
  if (!Number.isFinite(raw) || raw < 5) return 15;
  return Math.min(raw, 60);
}

function getCheckInQrSecret() {
  return (
    process.env.CHECKIN_QR_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-checkin-secret-change-me"
  );
}

function bucketForDate(date: Date, intervalMinutes: number) {
  const ms = intervalMinutes * 60 * 1000;
  return Math.floor(date.getTime() / ms);
}

function signBucket(loc: string, bucket: number) {
  return createHmac("sha256", getCheckInQrSecret())
    .update(`${loc}:${bucket}`)
    .digest("hex")
    .slice(0, 20);
}

export function createRotatingCheckInToken(loc: string, at = new Date()) {
  const intervalMinutes = getCheckInQrIntervalMinutes();
  const bucket = bucketForDate(at, intervalMinutes);
  const sig = signBucket(loc, bucket);
  return `${bucket}.${sig}`;
}

export function validateRotatingCheckInToken(
  loc: string,
  token: string | undefined,
  at = new Date(),
): boolean {
  if (!loc?.trim() || !token?.trim()) return false;

  const parts = token.trim().split(".");
  if (parts.length !== 2) return false;

  const bucket = Number(parts[0]);
  const sig = parts[1];
  if (!Number.isInteger(bucket) || !sig) return false;

  const intervalMinutes = getCheckInQrIntervalMinutes();
  const currentBucket = bucketForDate(at, intervalMinutes);

  // Current window + previous window (grace while QR refreshes on tablet).
  const allowedBuckets = [currentBucket, currentBucket - 1];
  if (!allowedBuckets.includes(bucket)) return false;

  const expected = signBucket(loc, bucket);
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getCheckInQrExpiry(at = new Date()) {
  const intervalMinutes = getCheckInQrIntervalMinutes();
  const ms = intervalMinutes * 60 * 1000;
  const bucket = bucketForDate(at, intervalMinutes);
  return new Date((bucket + 1) * ms);
}

export function buildRotatingCheckInQrUrl(
  baseUrl: string,
  loc = "zandvoort",
  at = new Date(),
) {
  const token = createRotatingCheckInToken(loc, at);
  const url = new URL("/check-in", baseUrl.replace(/\/$/, ""));
  url.searchParams.set("loc", loc);
  url.searchParams.set("token", token);
  return url.toString();
}

export function secondsUntilCheckInQrExpiry(at = new Date()) {
  const expiry = getCheckInQrExpiry(at);
  return Math.max(0, Math.ceil((expiry.getTime() - at.getTime()) / 1000));
}

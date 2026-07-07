import { DateTime } from "luxon";

import {
  buildRotatingCheckInQrUrl,
  CHECKIN_TIMEZONE,
  validateRotatingCheckInToken,
} from "@/lib/checkin/rotatingToken";

/**
 * Parse a scanned QR (full URL or /check-in path) into check-in params.
 * Token validity is checked server-side — the signing secret must never ship to the client.
 */
export function parseCheckInScan(
  raw: string,
): { loc: string; token: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, "https://woof.local");

    const path = url.pathname.replace(/\/$/, "");
    if (!path.endsWith("/check-in")) return null;

    const loc = url.searchParams.get("loc")?.trim();
    const token = url.searchParams.get("token")?.trim();
    if (!loc || !token) return null;

    return { loc, token };
  } catch {
    return null;
  }
}

export function isValidCheckInQrAccess(
  loc: string | undefined,
  token: string | undefined,
): boolean {
  if (!loc?.trim()) return false;
  return validateRotatingCheckInToken(loc, token);
}

export function buildCheckInQrUrl(baseUrl: string, loc = "zandvoort") {
  return buildRotatingCheckInQrUrl(baseUrl, loc);
}

export function startOfTodayAmsterdam() {
  return DateTime.now().setZone(CHECKIN_TIMEZONE).startOf("day").toJSDate();
}

export async function getDogsCheckedInToday(
  dogIds: string[],
  prisma: {
    visit: {
      findMany: (args: {
        where: { dogProfileId: { in: string[] }; visitedAt: { gte: Date } };
        select: { dogProfileId: true };
      }) => Promise<{ dogProfileId: string }[]>;
    };
  },
) {
  if (dogIds.length === 0) return new Set<string>();

  const visits = await prisma.visit.findMany({
    where: {
      dogProfileId: { in: dogIds },
      visitedAt: { gte: startOfTodayAmsterdam() },
    },
    select: { dogProfileId: true },
  });

  return new Set(visits.map((v) => v.dogProfileId));
}

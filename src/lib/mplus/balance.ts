import { isMplusConfigured } from "@/lib/mplus/config";
import {
  findWoofWalletGiftcardType,
  getGiftcard,
  getGiftcardHistory,
  getGiftcardTypes,
  type MplusGiftcardHistoryEntry,
} from "@/lib/mplus/giftcard";
import { prisma } from "@/lib/prisma";

export type WalletBalanceLive = {
  source: "live";
  balanceEur: number;
  active: boolean;
  validUntil: string | null;
  cardTypeName: string | null;
  history: MplusGiftcardHistoryEntry[];
};

export type WalletBalanceCached = {
  source: "cache";
  balanceEur: number;
  cachedAt: Date;
};

export type WalletBalanceUnavailable = {
  source: "unavailable";
  reason: "not_configured" | "not_found" | "error";
};

export type WalletBalanceView =
  | WalletBalanceLive
  | WalletBalanceCached
  | WalletBalanceUnavailable;

type LiveWalletBalanceResult =
  | {
      ok: true;
      balanceEur: number;
      active: boolean;
      validUntil: string | null;
      cardTypeName: string | null;
      history: MplusGiftcardHistoryEntry[];
    }
  | {
      ok: false;
      reason: "not_configured" | "not_found" | "error";
    };

/** Whether a stored wallet balance is safe to show when Mplus is offline. */
export function isDisplayableCachedBalance(
  balanceEur: number,
  balanceConfirmedAt: Date | null | undefined,
): boolean {
  if (balanceEur > 0) {
    return true;
  }
  return balanceEur === 0 && balanceConfirmedAt != null;
}

function sortGiftcardHistory(
  history: MplusGiftcardHistoryEntry[],
): MplusGiftcardHistoryEntry[] {
  return [...history].sort((a, b) => {
    const aTime = Date.parse(a.dateTime ?? a.bookDate ?? "") || 0;
    const bTime = Date.parse(b.dateTime ?? b.bookDate ?? "") || 0;
    return bTime - aTime;
  });
}

function balanceFromHistory(
  history: MplusGiftcardHistoryEntry[],
): { balanceEur: number; history: MplusGiftcardHistoryEntry[] } | null {
  if (history.length === 0) return null;

  const sorted = sortGiftcardHistory(history);
  const latestWithBalance = sorted.find(
    (entry) => entry.balanceAfterBookingEur !== null,
  );
  if (!latestWithBalance || latestWithBalance.balanceAfterBookingEur === null) {
    return null;
  }

  return {
    balanceEur: latestWithBalance.balanceAfterBookingEur,
    history: sorted.slice(0, 8),
  };
}

async function fetchLiveWalletBalance(
  walletCardId: string,
): Promise<LiveWalletBalanceResult> {
  if (!isMplusConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const cardNumber = walletCardId.trim();
  if (!cardNumber) {
    return { ok: false, reason: "not_found" };
  }

  try {
    let giftcard: Awaited<ReturnType<typeof getGiftcard>>;
    try {
      giftcard = await getGiftcard(cardNumber);
    } catch (error) {
      console.error("[mplus] getGiftcard failed during balance fetch", {
        walletCardId: cardNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, reason: "error" };
    }

    if (giftcard) {
      let cardTypeName: string | null = null;
      try {
        const types = await getGiftcardTypes();
        const woofType = findWoofWalletGiftcardType(types);
        cardTypeName =
          types.find((type) => type.cardTypeId === giftcard.cardTypeId)?.name ??
          woofType?.name ??
          null;
      } catch (error) {
        console.error("[mplus] getGiftcardTypes failed during balance fetch", {
          walletCardId: cardNumber,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      let history: MplusGiftcardHistoryEntry[] = [];
      try {
        history = sortGiftcardHistory(await getGiftcardHistory(cardNumber)).slice(
          0,
          8,
        );
      } catch (error) {
        console.error("[mplus] getGiftcardHistory failed after getGiftcard", {
          walletCardId: cardNumber,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return {
        ok: true,
        balanceEur: giftcard.currentBalanceEur,
        active: giftcard.active,
        validUntil: giftcard.validUntil,
        cardTypeName,
        history,
      };
    }

    let history: MplusGiftcardHistoryEntry[];
    try {
      history = await getGiftcardHistory(cardNumber);
    } catch (error) {
      console.error("[mplus] getGiftcardHistory failed during balance fetch", {
        walletCardId: cardNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, reason: "error" };
    }

    const fromHistory = balanceFromHistory(history);
    if (fromHistory) {
      console.info("[mplus] wallet balance derived from giftcard history", {
        walletCardId: cardNumber,
        balanceEur: fromHistory.balanceEur,
      });
      return {
        ok: true,
        balanceEur: fromHistory.balanceEur,
        active: true,
        validUntil: null,
        cardTypeName: null,
        history: fromHistory.history,
      };
    }

    return { ok: false, reason: "not_found" };
  } catch (error) {
    console.error("[mplus] getWalletBalance failed", {
      walletCardId: cardNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: "error" };
  }
}

async function sumPendingOfflineTopUps(
  dogProfileId: string,
  since: Date | null | undefined,
): Promise<number> {
  const topUps = await prisma.topUp.findMany({
    where: {
      dogProfileId,
      ...(since ? { toppedUpAt: { gt: since } } : {}),
    },
    select: { amountEur: true },
  });

  const total = topUps.reduce((sum, topUp) => sum + Number(topUp.amountEur), 0);
  return Math.round(total * 100) / 100;
}

/** Overwrites cache with live Mplus balance; logs when cache differed. */
async function reconcileAndPersistLiveWalletBalance(
  dogProfileId: string,
  liveBalanceEur: number,
): Promise<void> {
  const link = await prisma.woofWalletLink.findUnique({
    where: { dogProfileId },
    select: {
      lastKnownBalanceEur: true,
      balanceConfirmedAt: true,
    },
  });

  const cachedBalanceEur =
    link?.lastKnownBalanceEur != null ? Number(link.lastKnownBalanceEur) : null;
  const pendingOfflineTopUpsEur = await sumPendingOfflineTopUps(
    dogProfileId,
    link?.balanceConfirmedAt,
  );

  const roundedLive = Math.round(liveBalanceEur * 100) / 100;
  if (
    cachedBalanceEur != null &&
    Math.abs(cachedBalanceEur - roundedLive) > 0.001
  ) {
    console.warn("[mplus] wallet balance reconciled: trusting live Mplus", {
      dogProfileId,
      cachedBalanceEur,
      liveBalanceEur: roundedLive,
      pendingOfflineTopUpsEur,
      diffEur: Math.round((roundedLive - cachedBalanceEur) * 100) / 100,
    });
  }

  const now = new Date();
  await prisma.woofWalletLink.update({
    where: { dogProfileId },
    data: {
      lastKnownBalanceEur: roundedLive,
      lastBalanceFetchedAt: now,
      balanceConfirmedAt: now,
    },
  });
}

/** Increments cached balance after a successful top-up (e.g. while Mplus is offline). */
export async function applyWalletTopUpToCache(
  dogProfileId: string,
  amountEur: number,
): Promise<number> {
  const link = await prisma.woofWalletLink.findUnique({
    where: { dogProfileId },
    select: { lastKnownBalanceEur: true },
  });
  if (!link) {
    throw new Error("wallet_not_linked");
  }

  const base =
    link.lastKnownBalanceEur != null ? Number(link.lastKnownBalanceEur) : 0;
  const newBalance = Math.round((base + amountEur) * 100) / 100;

  await prisma.woofWalletLink.update({
    where: { dogProfileId },
    data: {
      lastKnownBalanceEur: newBalance,
      lastBalanceFetchedAt: new Date(),
    },
  });

  return newBalance;
}

async function readWalletBalanceCache(
  dogProfileId: string,
): Promise<WalletBalanceCached | null> {
  const link = await prisma.woofWalletLink.findUnique({
    where: { dogProfileId },
    select: {
      lastKnownBalanceEur: true,
      lastBalanceFetchedAt: true,
      balanceConfirmedAt: true,
      linkedAt: true,
    },
  });

  if (link?.lastKnownBalanceEur == null) {
    return null;
  }

  const balanceEur = Number(link.lastKnownBalanceEur);
  if (!isDisplayableCachedBalance(balanceEur, link.balanceConfirmedAt)) {
    return null;
  }

  return {
    source: "cache",
    balanceEur,
    cachedAt: link.lastBalanceFetchedAt ?? link.linkedAt,
  };
}

/** Sum registered top-ups when no live or cached Mplus balance is available. */
async function readWalletBalanceFromTopUps(
  dogProfileId: string,
): Promise<WalletBalanceCached | null> {
  const topUps = await prisma.topUp.findMany({
    where: { dogProfileId },
    select: { amountEur: true, toppedUpAt: true },
    orderBy: { toppedUpAt: "desc" },
  });

  if (topUps.length === 0) {
    return null;
  }

  const balanceEur = topUps.reduce(
    (sum, topUp) => sum + Number(topUp.amountEur),
    0,
  );

  const rounded = Math.round(balanceEur * 100) / 100;
  if (rounded <= 0) {
    return null;
  }

  return {
    source: "cache",
    balanceEur: rounded,
    cachedAt: topUps[0].toppedUpAt,
  };
}

export async function getWalletBalance(
  walletCardId: string,
  dogProfileId?: string,
): Promise<WalletBalanceView> {
  const live = await fetchLiveWalletBalance(walletCardId);

  if (live.ok) {
    if (dogProfileId) {
      try {
        await reconcileAndPersistLiveWalletBalance(
          dogProfileId,
          live.balanceEur,
        );
      } catch (error) {
        console.error("[mplus] failed to persist wallet balance cache", {
          dogProfileId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      source: "live",
      balanceEur: live.balanceEur,
      active: live.active,
      validUntil: live.validUntil,
      cardTypeName: live.cardTypeName,
      history: live.history,
    };
  }

  if (dogProfileId) {
    const cached = await readWalletBalanceCache(dogProfileId);
    if (cached) {
      return cached;
    }

    const fromTopUps = await readWalletBalanceFromTopUps(dogProfileId);
    if (fromTopUps) {
      return fromTopUps;
    }
  }

  return { source: "unavailable", reason: live.reason };
}

/** Seeds or refreshes the cached balance after linking a wallet card. */
export async function seedWalletBalanceCache(
  dogProfileId: string,
  walletCardId: string,
): Promise<void> {
  await getWalletBalance(walletCardId, dogProfileId);
}

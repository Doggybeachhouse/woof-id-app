import { getGiftcardHistory } from "@/lib/mplus/giftcard";
import {
  collectGiftCardPayments,
  computeSessionTotalEur,
  extractWalletCardNumber,
  giftCardPaymentTotalEur,
  parseEventTimestamp,
} from "@/lib/mplus/webhook/parseCompleteSession";
import type { MplusCompleteSessionPayload } from "@/lib/mplus/webhook/types";
import { coinsFromPurchaseEur } from "@/lib/gamification/receiptCoins";
import { getTranslatorForLocale } from "@/i18n/server";
import { defaultLocale } from "@/i18n/config";
import { sendPushToUser } from "@/lib/push/send";
import {
  buildWalletPurchaseItems,
  recordWalletPurchase,
} from "@/lib/mplus/walletPurchaseRecord";
import { prisma } from "@/lib/prisma";

const HISTORY_MATCH_WINDOW_MS = 5 * 60 * 1000;

export type WalletPurchaseResult =
  | { status: "skipped"; reason: string }
  | { status: "duplicate"; sessionId: string }
  | {
      status: "processed";
      sessionId: string;
      dogProfileId: string;
      receiptId: string;
      totalEur: number;
      coins: number;
      pushSent: number;
    };

async function resolveWalletCardByHistory(
  amountEur: number,
  eventTimestamp: Date,
): Promise<string | null> {
  if (amountEur <= 0) return null;

  const links = await prisma.woofWalletLink.findMany({
    select: { walletCardId: true },
  });

  for (const link of links) {
    let history;
    try {
      history = await getGiftcardHistory(link.walletCardId);
    } catch {
      continue;
    }
    const match = history.find((entry) => {
      if (entry.bookingAmountEur >= 0) return false;
      const absAmount = Math.abs(entry.bookingAmountEur);
      if (Math.abs(absAmount - amountEur) > 0.02) return false;

      const when = Date.parse(entry.dateTime ?? entry.bookDate ?? "");
      if (!Number.isFinite(when)) return false;
      return Math.abs(when - eventTimestamp.getTime()) <= HISTORY_MATCH_WINDOW_MS;
    });

    if (match) return link.walletCardId;
  }

  return null;
}

export async function processWalletPurchaseFromCompleteSession(
  payload: MplusCompleteSessionPayload,
): Promise<WalletPurchaseResult> {
  const sessionId = payload.session?.sessionId?.trim();
  if (!sessionId) {
    return { status: "skipped", reason: "missing_session_id" };
  }

  const giftPayments = collectGiftCardPayments(payload);
  if (giftPayments.length === 0) {
    return { status: "skipped", reason: "no_gift_card_payment" };
  }

  const eventTimestamp = parseEventTimestamp(payload);
  let walletCardId = extractWalletCardNumber(giftPayments, payload.session);
  if (!walletCardId) {
    const giftTotal = giftCardPaymentTotalEur(giftPayments);
    walletCardId = await resolveWalletCardByHistory(giftTotal, eventTimestamp);
  }

  if (!walletCardId) {
    return { status: "skipped", reason: "wallet_card_not_identified" };
  }

  const walletLink = await prisma.woofWalletLink.findFirst({
    where: { walletCardId },
    include: { dog: { select: { id: true, name: true, ownerUserId: true } } },
  });

  if (!walletLink) {
    return { status: "skipped", reason: "wallet_not_linked" };
  }

  const sessionTotal = computeSessionTotalEur(payload.session);
  const giftTotal = giftCardPaymentTotalEur(giftPayments);
  const purchaseTotalEur =
    sessionTotal > 0 ? sessionTotal : giftTotal > 0 ? giftTotal : 0;
  const coins = coinsFromPurchaseEur(purchaseTotalEur);

  const lines = payload.session?.lines ?? [];
  const lineSources =
    lines.length > 0
      ? lines.map((line) => ({
          name: line.text?.trim() || "Onbekend product",
          quantity: Math.max(1, Math.round(line.quantity ?? 1)),
          articleNumber:
            line.articleNumber != null ? String(line.articleNumber) : undefined,
          unitPriceEur: line.priceIncl ?? null,
        }))
      : null;

  const recorded = await recordWalletPurchase({
    dogProfileId: walletLink.dogProfileId,
    mplusSessionId: sessionId,
    totalEur: purchaseTotalEur,
    confirmedAt: eventTimestamp,
    items: buildWalletPurchaseItems(lineSources, purchaseTotalEur),
  });

  if (recorded.alreadyExists) {
    return { status: "duplicate", sessionId };
  }

  let pushSent = 0;
  try {
    const t = getTranslatorForLocale(defaultLocale);
    const pushResult = await sendPushToUser(walletLink.dog.ownerUserId, {
      title: t("mplus.webhook.pushTitle", { dogName: walletLink.dog.name }),
      body: t("mplus.webhook.pushBody", {
        coins,
        total: purchaseTotalEur.toFixed(2),
      }),
      url: `/dogs/${walletLink.dogProfileId}`,
    });
    pushSent = pushResult.sent;
  } catch (error) {
    console.error("[mplus/webhook] push notification failed", {
      dogProfileId: walletLink.dogProfileId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  console.info("[mplus/webhook] wallet purchase processed", {
    sessionId,
    dogProfileId: walletLink.dogProfileId,
    walletCardId,
    purchaseTotalEur,
    coins,
    pushSent,
  });

  return {
    status: "processed",
    sessionId,
    dogProfileId: walletLink.dogProfileId,
    receiptId: recorded.receiptId,
    totalEur: purchaseTotalEur,
    coins,
    pushSent,
  };
}

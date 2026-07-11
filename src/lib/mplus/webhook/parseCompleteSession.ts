import type {
  MplusCompleteSessionPayload,
  MplusWebhookLine,
  MplusWebhookPayment,
  MplusWebhookSession,
} from "@/lib/mplus/webhook/types";

const DEFAULT_GIFT_CARD_METHOD_PATTERN =
  /CADEAU|GIFT.?CARD|GIFTKAART|WOOF.?WALLET/i;

function configuredGiftCardMethods(): Set<string> | null {
  const raw = process.env.MPLUS_WALLET_PAYMENT_METHODS?.trim();
  if (!raw) return null;
  const methods = raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  return methods.length > 0 ? new Set(methods) : null;
}

export function isGiftCardPayment(payment: MplusWebhookPayment): boolean {
  const method = payment.method?.trim().toUpperCase() ?? "";
  const description = payment.description?.trim() ?? "";
  const configured = configuredGiftCardMethods();

  if (configured && method && configured.has(method)) {
    return true;
  }

  return (
    DEFAULT_GIFT_CARD_METHOD_PATTERN.test(method) ||
    DEFAULT_GIFT_CARD_METHOD_PATTERN.test(description)
  );
}

export function collectGiftCardPayments(
  payload: MplusCompleteSessionPayload,
): MplusWebhookPayment[] {
  const finalPayments = payload.completeSession?.payments ?? [];
  const sessionPayments = payload.session?.payments ?? [];
  const combined = [...finalPayments, ...sessionPayments];
  const giftPayments = combined.filter(isGiftCardPayment);

  const seen = new Set<string>();
  return giftPayments.filter((payment) => {
    const key = [
      payment.paymentId ?? "",
      payment.method ?? "",
      payment.description ?? "",
      payment.amount ?? "",
      payment.cardNumber ?? payment.giftcardNumber ?? payment.giftCardNumber ?? "",
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractWalletCardNumber(
  payments: MplusWebhookPayment[],
  session?: MplusWebhookSession,
): string | null {
  const candidates: Array<string | undefined> = [
    session?.relation?.cardNumber,
  ];

  for (const payment of payments) {
    candidates.push(
      payment.cardNumber,
      payment.giftcardNumber,
      payment.giftCardNumber,
      payment.reference,
      payment.barcode,
      payment.externalReference,
    );

    const digits = payment.description?.match(/\b\d{6,}\b/)?.[0];
    if (digits) candidates.push(digits);
  }

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && trimmed.length >= 4) {
      return trimmed;
    }
  }

  return null;
}

export function computeSessionTotalEur(session?: MplusWebhookSession): number {
  if (!session) return 0;

  if (
    typeof session.totalInclAmount === "number" &&
    Number.isFinite(session.totalInclAmount) &&
    session.totalInclAmount > 0
  ) {
    return session.totalInclAmount;
  }

  return (session.lines ?? []).reduce((sum, line) => sum + lineTotalEur(line), 0);
}

function lineTotalEur(line: MplusWebhookLine): number {
  const quantity = line.quantity ?? 1;
  const unitPrice = line.priceIncl ?? 0;
  let total = unitPrice * quantity;

  if (line.discountAmount) {
    total -= line.discountAmount;
  }
  if (line.discountPercentage) {
    total *= 1 - line.discountPercentage / 100;
  }

  return Math.max(0, total);
}

export function giftCardPaymentTotalEur(
  payments: MplusWebhookPayment[],
): number {
  return payments.reduce((sum, payment) => {
    const amount = payment.amount ?? 0;
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

export function parseEventTimestamp(
  payload: MplusCompleteSessionPayload,
): Date {
  const raw = payload.event?.eventTimestamp;
  if (!raw) return new Date();
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : new Date();
}

import type {
  MplusCompleteSessionPayload,
  MplusWebhookLine,
} from "@/lib/mplus/webhook/types";
import { prisma } from "@/lib/prisma";

export type VoucherRedeemResult =
  | { status: "skipped"; reason: string }
  | { status: "redeemed"; voucherId: string; code: string; sessionId: string }
  | { status: "already_redeemed"; voucherId: string };

function collectDiscountIds(lines: MplusWebhookLine[]): string[] {
  const ids = new Set<string>();
  for (const line of lines) {
    const discountId = line.externalDiscount?.discountId?.trim();
    if (discountId) ids.add(discountId);
  }
  return [...ids];
}

export async function processVoucherRedemptionFromCompleteSession(
  payload: MplusCompleteSessionPayload,
): Promise<VoucherRedeemResult> {
  const sessionId = payload.session?.sessionId?.trim();
  if (!sessionId) {
    return { status: "skipped", reason: "missing_session_id" };
  }

  const lines = payload.session?.lines ?? [];
  const discountIds = collectDiscountIds(lines);

  let voucher =
    discountIds.length > 0
      ? await prisma.rewardVoucher.findFirst({
          where: { mplusDiscountId: { in: discountIds } },
        })
      : null;

  if (!voucher) {
    voucher = await prisma.rewardVoucher.findFirst({
      where: {
        mplusSessionId: sessionId,
        status: { in: ["ACTIVE", "VALIDATED"] },
      },
    });
  }

  if (!voucher) {
    return { status: "skipped", reason: "no_voucher_in_session" };
  }

  if (voucher.status === "REDEEMED") {
    return { status: "already_redeemed", voucherId: voucher.id };
  }

  const updated = await prisma.rewardVoucher.updateMany({
    where: {
      id: voucher.id,
      status: { in: ["ACTIVE", "VALIDATED"] },
    },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      mplusSessionId: sessionId,
    },
  });

  if (updated.count === 0) {
    const refreshed = await prisma.rewardVoucher.findUnique({
      where: { id: voucher.id },
    });
    if (refreshed?.status === "REDEEMED") {
      return { status: "already_redeemed", voucherId: voucher.id };
    }
    return { status: "skipped", reason: "voucher_update_failed" };
  }

  await prisma.mplusSessionContext.deleteMany({ where: { sessionId } }).catch(() => null);

  console.info("[mplus/webhook] voucher redeemed", {
    sessionId,
    voucherId: voucher.id,
    code: voucher.code,
    rewardId: voucher.rewardId,
  });

  return {
    status: "redeemed",
    voucherId: voucher.id,
    code: voucher.code,
    sessionId,
  };
}

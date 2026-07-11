import { randomUUID } from "node:crypto";

import { getRewardArticleRule } from "@/lib/mplus/rewardArticleMap";
import {
  getMplusSessionContext,
  upsertMplusSessionContext,
} from "@/lib/mplus/sessionContext";
import type {
  MplusAddSessionLineResponse,
  MplusCompleteSessionPayload,
  MplusLineChange,
} from "@/lib/mplus/webhook/types";
import { prisma } from "@/lib/prisma";

const USABLE_VOUCHER_STATUSES = ["ACTIVE", "VALIDATED"] as const;

export async function processAddSessionLineWebhook(
  payload: MplusCompleteSessionPayload,
): Promise<MplusAddSessionLineResponse> {
  const sessionId = payload.session?.sessionId?.trim();
  const line = payload.addSessionLine?.line;
  if (!sessionId || !line?.lineId) {
    return {};
  }

  const context = await getMplusSessionContext(sessionId);
  if (!context?.voucherId || !context.rewardId) {
    return {};
  }

  const voucher = await prisma.rewardVoucher.findUnique({
    where: { id: context.voucherId },
    include: { dog: { select: { name: true } } },
  });

  if (!voucher || !USABLE_VOUCHER_STATUSES.includes(voucher.status as "ACTIVE" | "VALIDATED")) {
    return {};
  }

  const rule = getRewardArticleRule(context.rewardId);
  if (!rule || rule.articleNumbers.length === 0) {
    return {};
  }

  const articleNumber = line.articleNumber != null ? String(line.articleNumber).trim() : "";
  if (!rule.articleNumbers.includes(articleNumber)) {
    return {};
  }

  const discountId = voucher.mplusDiscountId ?? randomUUID();

  if (!voucher.mplusDiscountId || voucher.mplusSessionId !== sessionId) {
    await prisma.rewardVoucher.update({
      where: { id: voucher.id },
      data: {
        mplusDiscountId: discountId,
        mplusSessionId: sessionId,
        appliedAt: new Date(),
      },
    });
  }

  const lineChange: MplusLineChange = {
    lineId: line.lineId,
    externalDiscount: {
      discountId,
      discountDescription: rule.discountDescription,
      discountPercentage: rule.discountPercentage,
      discountType: "woof-voucher",
      applyToQuantity: 1,
    },
  };

  return { lineChanges: [lineChange] };
}

export async function applyVoucherDiscountToLine(input: {
  sessionId: string;
  voucherId: string;
  rewardId: string;
  lineId: string;
}): Promise<MplusLineChange | null> {
  const rule = getRewardArticleRule(input.rewardId);
  if (!rule) return null;

  const voucher = await prisma.rewardVoucher.findUnique({
    where: { id: input.voucherId },
  });
  if (!voucher || !USABLE_VOUCHER_STATUSES.includes(voucher.status as "ACTIVE" | "VALIDATED")) {
    return null;
  }

  const discountId = voucher.mplusDiscountId ?? randomUUID();
  await prisma.rewardVoucher.update({
    where: { id: voucher.id },
    data: {
      mplusDiscountId: discountId,
      mplusSessionId: input.sessionId,
      appliedAt: new Date(),
    },
  });

  return {
    lineId: input.lineId,
    externalDiscount: {
      discountId,
      discountDescription: rule.discountDescription,
      discountPercentage: rule.discountPercentage,
      discountType: "woof-voucher",
      applyToQuantity: 1,
    },
  };
}

export async function linkWalletToSession(sessionId: string, dogProfileId: string) {
  await upsertMplusSessionContext({ sessionId, dogProfileId });
}

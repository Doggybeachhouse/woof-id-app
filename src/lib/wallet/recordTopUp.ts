import { revalidatePath } from "next/cache";

import { applyWalletTopUpToCache } from "@/lib/mplus/balance";
import { processDogEvent } from "@/lib/gamification/processDogEvent";
import { prisma } from "@/lib/prisma";

export type RecordWalletTopUpInput = {
  dogProfileId: string;
  amountEur: number;
  registeredById?: string;
  note?: string;
  wooOrderId?: number;
};

export type RecordWalletTopUpResult = {
  topUpId: string;
  alreadyRecorded: boolean;
  newBalanceEur: number;
};

export async function recordWalletTopUp(
  input: RecordWalletTopUpInput,
): Promise<RecordWalletTopUpResult> {
  const amountEur = Math.round(input.amountEur * 100) / 100;
  if (amountEur <= 0) {
    throw new Error("invalid_amount");
  }

  if (input.wooOrderId && input.wooOrderId > 0) {
    const existing = await prisma.topUp.findUnique({
      where: { wooOrderId: input.wooOrderId },
      select: { id: true, dogProfileId: true, amountEur: true },
    });
    if (existing) {
      const link = await prisma.woofWalletLink.findUnique({
        where: { dogProfileId: existing.dogProfileId },
        select: { lastKnownBalanceEur: true },
      });
      return {
        topUpId: existing.id,
        alreadyRecorded: true,
        newBalanceEur:
          link?.lastKnownBalanceEur != null
            ? Number(link.lastKnownBalanceEur)
            : Number(existing.amountEur),
      };
    }
  }

  const priorCount = await prisma.topUp.count({
    where: { dogProfileId: input.dogProfileId },
  });

  const topUp = await prisma.topUp.create({
    data: {
      dogProfileId: input.dogProfileId,
      amountEur,
      registeredById: input.registeredById,
      note: input.note,
      wooOrderId:
        input.wooOrderId && input.wooOrderId > 0 ? input.wooOrderId : undefined,
    },
  });

  const newBalanceEur = await applyWalletTopUpToCache(
    input.dogProfileId,
    amountEur,
  );

  await processDogEvent({
    dogProfileId: input.dogProfileId,
    eventType: "TOP_UP",
    payload: {
      topUpId: topUp.id,
      amountEur,
      isFirstTopUp: priorCount === 0,
    },
  });

  revalidatePath(`/dogs/${input.dogProfileId}`);
  revalidatePath("/dogs");

  return {
    topUpId: topUp.id,
    alreadyRecorded: false,
    newBalanceEur,
  };
}

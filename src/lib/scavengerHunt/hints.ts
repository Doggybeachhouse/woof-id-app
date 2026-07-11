import { HuntHintSource } from "@prisma/client";

import type { Locale } from "@/i18n/config";
import { getCheckpointByIndex } from "@/lib/scavengerHunt/checkpoints";
import { HUNT_HINT_PRICE_EUR } from "@/lib/scavengerHunt/constants";
import { fetchHuntHintPaymentStatus } from "@/lib/wordpress/huntHint";
import { prisma } from "@/lib/prisma";

export type HuntHintStatus = {
  revealed: boolean;
  hintText: string | null;
  freeHintUsed: boolean;
  canUseFreeHint: boolean;
  needsPurchase: boolean;
  priceEur: string;
};

async function getOrCreateProgress(dogId: string, huntSlug: string) {
  let progress = await prisma.scavengerHuntProgress.findUnique({
    where: { dogProfileId_huntSlug: { dogProfileId: dogId, huntSlug } },
    include: { hintReveals: true },
  });

  if (!progress) {
    progress = await prisma.scavengerHuntProgress.create({
      data: { dogProfileId: dogId, huntSlug, currentStep: 0 },
      include: { hintReveals: true },
    });
  }

  return progress;
}

function hintTextForCheckpoint(
  huntSlug: string,
  checkpointIndex: number,
  locale: Locale,
): string | null {
  const checkpoint = getCheckpointByIndex(huntSlug, checkpointIndex);
  return checkpoint?.hint[locale] ?? null;
}

export async function getHuntHintStatus(input: {
  dogId: string;
  huntSlug: string;
  checkpointIndex: number;
  locale: Locale;
  userId: string;
}): Promise<HuntHintStatus | { error: string; status: number }> {
  const dog = await prisma.dogProfile.findUnique({
    where: { id: input.dogId },
    select: { ownerUserId: true },
  });
  if (!dog || dog.ownerUserId !== input.userId) {
    return { error: "Forbidden", status: 403 };
  }

  const checkpoint = getCheckpointByIndex(input.huntSlug, input.checkpointIndex);
  if (!checkpoint) {
    return { error: "Invalid checkpoint", status: 400 };
  }

  const progress = await getOrCreateProgress(input.dogId, input.huntSlug);
  const reveal = progress.hintReveals.find(
    (r) => r.checkpointIndex === input.checkpointIndex,
  );

  const revealed = Boolean(reveal);
  const canUseFreeHint = !progress.freeHintUsed && !revealed;

  return {
    revealed,
    hintText: revealed
      ? hintTextForCheckpoint(input.huntSlug, input.checkpointIndex, input.locale)
      : null,
    freeHintUsed: progress.freeHintUsed,
    canUseFreeHint,
    needsPurchase: !revealed && progress.freeHintUsed,
    priceEur: HUNT_HINT_PRICE_EUR,
  };
}

export async function revealFreeHuntHint(input: {
  dogId: string;
  huntSlug: string;
  checkpointIndex: number;
  locale: Locale;
  userId: string;
}): Promise<
  | { ok: true; hintText: string; source: HuntHintSource }
  | { ok: false; error: string; status: number; needsPurchase?: boolean }
> {
  const dog = await prisma.dogProfile.findUnique({
    where: { id: input.dogId },
    select: { ownerUserId: true },
  });
  if (!dog || dog.ownerUserId !== input.userId) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const checkpoint = getCheckpointByIndex(input.huntSlug, input.checkpointIndex);
  if (!checkpoint) {
    return { ok: false, error: "Invalid checkpoint", status: 400 };
  }

  const hintText = checkpoint.hint[input.locale];
  const progress = await getOrCreateProgress(input.dogId, input.huntSlug);

  const existing = progress.hintReveals.find(
    (r) => r.checkpointIndex === input.checkpointIndex,
  );
  if (existing) {
    return { ok: true, hintText, source: existing.source };
  }

  if (progress.freeHintUsed) {
    return {
      ok: false,
      error: "free_hint_used",
      status: 402,
      needsPurchase: true,
    };
  }

  await prisma.$transaction([
    prisma.scavengerHuntProgress.update({
      where: { id: progress.id },
      data: { freeHintUsed: true },
    }),
    prisma.scavengerHuntHintReveal.create({
      data: {
        progressId: progress.id,
        checkpointIndex: input.checkpointIndex,
        source: HuntHintSource.FREE,
      },
    }),
  ]);

  return { ok: true, hintText, source: HuntHintSource.FREE };
}

export async function fulfillPaidHuntHint(input: {
  progressId: string;
  checkpointIndex: number;
  orderId: number;
  email: string;
  locale: Locale;
  huntSlug: string;
  userId: string;
}): Promise<
  | { ok: true; hintText: string; alreadyFulfilled: boolean }
  | { ok: false; error: string; status: number; pending?: boolean }
> {
  const progress = await prisma.scavengerHuntProgress.findUnique({
    where: { id: input.progressId },
    include: {
      dog: { select: { ownerUserId: true } },
      hintReveals: true,
      hintPurchases: {
        where: { orderId: input.orderId },
        take: 1,
      },
    },
  });

  if (!progress || progress.dog.ownerUserId !== input.userId) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  if (progress.huntSlug !== input.huntSlug) {
    return { ok: false, error: "Invalid hunt", status: 400 };
  }

  const checkpoint = getCheckpointByIndex(input.huntSlug, input.checkpointIndex);
  if (!checkpoint) {
    return { ok: false, error: "Invalid checkpoint", status: 400 };
  }

  const existingReveal = progress.hintReveals.find(
    (r) => r.checkpointIndex === input.checkpointIndex,
  );
  if (existingReveal) {
    return {
      ok: true,
      hintText: checkpoint.hint[input.locale],
      alreadyFulfilled: true,
    };
  }

  const purchase = progress.hintPurchases[0];
  if (!purchase) {
    return { ok: false, error: "Purchase not found", status: 404 };
  }

  if (purchase.checkpointIndex !== input.checkpointIndex) {
    return { ok: false, error: "Checkpoint mismatch", status: 409 };
  }

  if (!purchase.paidAt) {
    const payment = await fetchHuntHintPaymentStatus({
      email: input.email,
      orderId: input.orderId,
    });
    if (!payment?.paid) {
      return { ok: false, error: "payment_pending", status: 402, pending: true };
    }

    await prisma.scavengerHuntHintPurchase.update({
      where: { id: purchase.id },
      data: { paidAt: new Date() },
    });
  }

  await prisma.scavengerHuntHintReveal.create({
    data: {
      progressId: progress.id,
      checkpointIndex: input.checkpointIndex,
      source: HuntHintSource.PAID,
    },
  });

  return {
    ok: true,
    hintText: checkpoint.hint[input.locale],
    alreadyFulfilled: false,
  };
}

export async function fulfillPaidHuntHintByOrder(input: {
  dogId: string;
  huntSlug: string;
  checkpointIndex: number;
  orderId: number;
  email: string;
  locale: Locale;
  userId: string;
}): Promise<
  | { ok: true; hintText: string; alreadyFulfilled: boolean }
  | { ok: false; error: string; status: number; pending?: boolean }
> {
  const progress = await prisma.scavengerHuntProgress.findUnique({
    where: {
      dogProfileId_huntSlug: { dogProfileId: input.dogId, huntSlug: input.huntSlug },
    },
    select: { id: true },
  });
  if (!progress) {
    return { ok: false, error: "Progress not found", status: 404 };
  }

  return fulfillPaidHuntHint({
    progressId: progress.id,
    checkpointIndex: input.checkpointIndex,
    orderId: input.orderId,
    email: input.email,
    locale: input.locale,
    huntSlug: input.huntSlug,
    userId: input.userId,
  });
}

export async function createHuntHintPurchaseRecord(input: {
  progressId: string;
  checkpointIndex: number;
  orderId: number;
  amountEur: number;
}) {
  return prisma.scavengerHuntHintPurchase.create({
    data: {
      progressId: input.progressId,
      checkpointIndex: input.checkpointIndex,
      orderId: input.orderId,
      amountEur: input.amountEur,
    },
  });
}

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { HuntRouteVariant } from "@/lib/scavengerHunt/hunts";

export type HuntSubmissionSnapshot = {
  checkpointIndex: number;
  imageUrl: string;
  lat: number;
  lng: number;
};

export async function recordHuntCompletion(params: {
  dogProfileId: string;
  huntSlug: string;
  routeVariant: HuntRouteVariant;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  submissions: HuntSubmissionSnapshot[];
}) {
  return prisma.scavengerHuntCompletion.create({
    data: {
      dogProfileId: params.dogProfileId,
      huntSlug: params.huntSlug,
      routeVariant: params.routeVariant,
      startedAt: params.startedAt,
      completedAt: params.completedAt,
      durationSeconds: params.durationSeconds,
      submissions: params.submissions as Prisma.InputJsonValue,
    },
  });
}

export async function resetHuntProgress(progressId: string) {
  await prisma.$transaction([
    prisma.scavengerHuntHintReveal.deleteMany({ where: { progressId } }),
    prisma.scavengerHuntHintPurchase.deleteMany({ where: { progressId } }),
    prisma.scavengerHuntSubmission.deleteMany({ where: { progressId } }),
    prisma.scavengerHuntProgress.update({
      where: { id: progressId },
      data: {
        currentStep: 0,
        freeHintUsed: false,
        startedAt: null,
        completedAt: null,
        durationSeconds: null,
        collageGeneratedAt: null,
      },
    }),
  ]);
}

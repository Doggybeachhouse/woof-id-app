import { CoinSourceType, JourneyEventType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getCheckpointByIndex, getHuntCheckpoints } from "@/lib/scavengerHunt/checkpoints";
import { canUseHuntTestMode } from "@/lib/scavengerHunt/testMode";
import {
  HUNT_COMPLETION_COINS,
  MAX_GPS_ACCURACY_METERS,
} from "@/lib/scavengerHunt/constants";
import { parseRouteVariant } from "@/lib/scavengerHunt/hunts";
import {
  getNextStepIndex,
  getSkipCheckpointIndices,
  isHuntComplete,
} from "@/lib/scavengerHunt/route";
import { isWithinRadius } from "@/lib/scavengerHunt/distance";
import { saveHuntPhoto } from "@/lib/scavengerHunt/storage";
import { evaluateDogAchievements } from "@/lib/gamification/processDogEvent";
import { prisma } from "@/lib/prisma";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/heic",
  "image/heif",
]);

function inferMimeType(file: File): string {
  if (file.type && ALLOWED_MIME.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return file.type;
}

const bodySchema = z.object({
  dogId: z.string().min(1),
  huntSlug: z.string().min(1),
  checkpointIndex: z.coerce.number().int().min(0),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().positive().optional(),
  testMode: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  routeVariant: z.enum(["full", "short"]).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse({
    dogId: formData.get("dogId"),
    huntSlug: formData.get("huntSlug"),
    checkpointIndex: formData.get("checkpointIndex"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    accuracy: formData.get("accuracy") || undefined,
    testMode: formData.get("testMode") ?? undefined,
    routeVariant: formData.get("routeVariant") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const {
    dogId,
    huntSlug,
    checkpointIndex,
    lat,
    lng,
    accuracy,
    testMode,
    routeVariant: requestedRouteVariant,
  } = parsed.data;

  if (testMode && !canUseHuntTestMode(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!testMode && accuracy != null && accuracy > MAX_GPS_ACCURACY_METERS) {
    return NextResponse.json(
      { error: "gps_accuracy", maxAccuracy: MAX_GPS_ACCURACY_METERS },
      { status: 400 },
    );
  }

  const dog = await prisma.dogProfile.findUnique({
    where: { id: dogId },
    select: { id: true, name: true, ownerUserId: true },
  });
  if (!dog || dog.ownerUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checkpoints = getHuntCheckpoints(huntSlug);
  if (checkpoints.length === 0) {
    return NextResponse.json({ error: "Unknown hunt" }, { status: 404 });
  }

  const checkpoint = getCheckpointByIndex(huntSlug, checkpointIndex);
  if (!checkpoint) {
    return NextResponse.json({ error: "Invalid checkpoint" }, { status: 400 });
  }

  if (testMode) {
    const variant = requestedRouteVariant ?? "full";
    const skipIndices = getSkipCheckpointIndices(huntSlug, variant);
    if (skipIndices.includes(checkpointIndex)) {
      return NextResponse.json({ error: "wrong_checkpoint" }, { status: 409 });
    }

    const nextStep = getNextStepIndex(huntSlug, checkpointIndex, variant);
    const isComplete = isHuntComplete(huntSlug, nextStep, variant);

    return NextResponse.json({
      ok: true,
      testMode: true,
      currentStep: nextStep,
      completed: isComplete,
      coinsAwarded: 0,
      durationSeconds: null,
      userRank: null,
    });
  }

  let progress = await prisma.scavengerHuntProgress.findUnique({
    where: { dogProfileId_huntSlug: { dogProfileId: dogId, huntSlug } },
    include: { submissions: true },
  });

  if (!progress) {
    progress = await prisma.scavengerHuntProgress.create({
      data: { dogProfileId: dogId, huntSlug, currentStep: 0 },
      include: { submissions: true },
    });
  }

  if (progress.completedAt) {
    return NextResponse.json({
      ok: true,
      completed: true,
      currentStep: progress.currentStep,
      coinsAwarded: 0,
    });
  }

  const routeVariant = parseRouteVariant(progress.routeVariant);
  const skipIndices = getSkipCheckpointIndices(huntSlug, routeVariant);

  if (skipIndices.includes(checkpointIndex)) {
    return NextResponse.json({ error: "wrong_checkpoint" }, { status: 409 });
  }

  if (checkpointIndex !== progress.currentStep) {
    const alreadySubmitted = progress.submissions.some(
      (s) => s.checkpointIndex === checkpointIndex,
    );
    if (alreadySubmitted) {
      return NextResponse.json({
        ok: true,
        currentStep: progress.currentStep,
        completed: false,
        idempotent: true,
      });
    }
    return NextResponse.json({ error: "wrong_checkpoint" }, { status: 409 });
  }

  if (
    !isWithinRadius(lat, lng, checkpoint.lat, checkpoint.lng, checkpoint.radiusMeters)
  ) {
    return NextResponse.json({ error: "too_far" }, { status: 400 });
  }

  const existingSubmission = progress.submissions.find(
    (s) => s.checkpointIndex === checkpointIndex,
  );
  if (existingSubmission) {
    return NextResponse.json({
      ok: true,
      currentStep: progress.currentStep,
      completed: false,
      idempotent: true,
    });
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "photo_required" }, { status: 400 });
  }

  const mimeType = inferMimeType(file);
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json({ error: "invalid_photo_type" }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "photo_too_large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let imageUrl: string;
  try {
    imageUrl = await saveHuntPhoto(progress.id, checkpointIndex, buffer, mimeType);
  } catch (error) {
    console.error("[hunt/submit] saveHuntPhoto failed", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const nextStep = getNextStepIndex(huntSlug, checkpointIndex, routeVariant);
  const isComplete = isHuntComplete(huntSlug, nextStep, routeVariant);
  const now = new Date();
  const startedAt = progress.startedAt ?? now;
  const durationSeconds = isComplete
    ? Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 1000))
    : null;

  const result = await prisma.$transaction(async (tx) => {
    await tx.scavengerHuntSubmission.create({
      data: {
        progressId: progress!.id,
        checkpointIndex,
        imageUrl,
        lat,
        lng,
      },
    });

    const updated = await tx.scavengerHuntProgress.update({
      where: { id: progress!.id },
      data: {
        currentStep: nextStep,
        startedAt: progress!.startedAt ?? now,
        completedAt: isComplete ? now : null,
        durationSeconds: isComplete ? durationSeconds : null,
      },
    });

    let coinsAwarded = 0;
    if (isComplete) {
      const allSubmissions = [
        ...progress!.submissions.map((s) => ({
          checkpointIndex: s.checkpointIndex,
          imageUrl: s.imageUrl,
          lat: s.lat,
          lng: s.lng,
        })),
        { checkpointIndex, imageUrl, lat, lng },
      ];

      await tx.scavengerHuntCompletion.create({
        data: {
          dogProfileId: dogId,
          huntSlug,
          routeVariant,
          startedAt,
          completedAt: now,
          durationSeconds: durationSeconds!,
          submissions: allSubmissions,
        },
      });

      const existingReward = await tx.coinLedger.findFirst({
        where: {
          dogProfileId: dogId,
          sourceType: CoinSourceType.MISSION,
          sourceId: progress!.id,
        },
      });

      if (!existingReward) {
        coinsAwarded = HUNT_COMPLETION_COINS;
        await tx.dogProfile.update({
          where: { id: dogId },
          data: { woofCoins: { increment: coinsAwarded } },
        });
        await tx.coinLedger.create({
          data: {
            dogProfileId: dogId,
            amount: coinsAwarded,
            reason: "Speurtocht voltooid",
            sourceType: CoinSourceType.MISSION,
            sourceId: progress!.id,
          },
        });
        await tx.journeyEvent.create({
          data: {
            dogProfileId: dogId,
            eventType: JourneyEventType.MISSION_COMPLETED,
            title: `${dog.name} voltooide de speurtocht!`,
            body: `+${coinsAwarded} Woof Coins`,
            metadata: { huntSlug, progressId: progress!.id },
          },
        });
        await tx.journeyEvent.create({
          data: {
            dogProfileId: dogId,
            eventType: JourneyEventType.COINS_EARNED,
            title: `+${coinsAwarded} Woof Coins`,
            body: "Speurtocht voltooid",
            metadata: { amount: coinsAwarded, sourceType: CoinSourceType.MISSION },
          },
        });
      }
    }

    return { updated, coinsAwarded };
  });

  await evaluateDogAchievements(dogId);

  let userRank: number | null = null;
  if (isComplete && durationSeconds != null) {
    const { getUserLeaderboardRank } = await import("@/lib/scavengerHunt/leaderboard");
    const rankResult = await getUserLeaderboardRank(huntSlug, routeVariant, dogId);
    userRank = rankResult.rank;
  }

  return NextResponse.json({
    ok: true,
    currentStep: result.updated.currentStep,
    completed: isComplete,
    coinsAwarded: result.coinsAwarded,
    durationSeconds,
    userRank,
  });
}

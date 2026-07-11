import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ScavengerHuntClient } from "@/app/hunt/_components/ScavengerHuntClient";
import { dogPhotoApiSrc } from "@/lib/dogs/photoUrl";
import { getHuntCheckpoints } from "@/lib/scavengerHunt/checkpoints";
import {
  getDurationMinutes,
  getHuntBySlug,
  getHuntDisplayName,
  parseRouteVariant,
} from "@/lib/scavengerHunt/hunts";
import { canChangeRouteVariant, resolveCurrentStep } from "@/lib/scavengerHunt/route";
import { getUserLeaderboardRank } from "@/lib/scavengerHunt/leaderboard";
import { canUseHuntTestMode } from "@/lib/scavengerHunt/testMode";
import { getTranslations } from "@/i18n/server";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function HuntPage({
  searchParams,
}: {
  searchParams: Promise<{ dogId?: string; slug?: string; route?: string }>;
}) {
  const { locale } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const canUseTestMode = canUseHuntTestMode(role);
  const { dogId: dogIdParam, slug: slugParam, route: routeParam } = await searchParams;

  const huntMeta = getHuntBySlug(slugParam ?? "zuid");
  if (!huntMeta) redirect("/hunts");

  const huntSlug = huntMeta.slug;
  const checkpoints = getHuntCheckpoints(huntSlug);
  if (checkpoints.length === 0) redirect("/hunts");

  const dogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, photoUrl: true, updatedAt: true },
  });

  if (dogs.length === 0) redirect("/dogs/new");

  const dogId =
    dogIdParam && dogs.some((d) => d.id === dogIdParam)
      ? dogIdParam
      : dogs[0]!.id;
  const dog = dogs.find((d) => d.id === dogId)!;
  const dogPhotoSrc = dog.photoUrl ? dogPhotoApiSrc(dog.id, dog.updatedAt) : null;

  let progress = await prisma.scavengerHuntProgress.findUnique({
    where: { dogProfileId_huntSlug: { dogProfileId: dogId, huntSlug } },
    include: { submissions: { select: { checkpointIndex: true } } },
  });

  const requestedRoute = routeParam ? parseRouteVariant(routeParam) : null;

  if (!progress) {
    progress = await prisma.scavengerHuntProgress.create({
      data: {
        dogProfileId: dogId,
        huntSlug,
        currentStep: 0,
        routeVariant: requestedRoute ?? "full",
      },
      include: { submissions: { select: { checkpointIndex: true } } },
    });
  } else if (
    requestedRoute &&
    progress.submissions.length === 0 &&
    !progress.completedAt &&
    progress.routeVariant !== requestedRoute
  ) {
    progress = await prisma.scavengerHuntProgress.update({
      where: { id: progress.id },
      data: { routeVariant: requestedRoute },
      include: { submissions: { select: { checkpointIndex: true } } },
    });
  }

  const routeVariant = parseRouteVariant(progress.routeVariant);
  const resolvedStep = resolveCurrentStep(progress.currentStep, huntSlug, routeVariant);

  let initialUserRank: number | null = null;
  if (progress.completedAt && progress.durationSeconds != null) {
    const rankResult = await getUserLeaderboardRank(huntSlug, routeVariant, dogId);
    initialUserRank = rankResult.rank;
  }

  if (resolvedStep !== progress.currentStep && !progress.completedAt) {
    progress = await prisma.scavengerHuntProgress.update({
      where: { id: progress.id },
      data: { currentStep: resolvedStep },
      include: { submissions: { select: { checkpointIndex: true } } },
    });
  }

  const hasSubmissions = progress.submissions.length > 0;
  const canChangeRoute = canChangeRouteVariant(
    huntSlug,
    progress.currentStep,
    progress.submissions,
    huntMeta,
  );
  const routeChangeCheckpointIndex =
    huntMeta.optionalSkipCheckpointIndex != null
      ? huntMeta.optionalSkipCheckpointIndex - 1
      : null;

  return (
    <Suspense fallback={null}>
      <ScavengerHuntClient
        dogId={dogId}
        dogName={dog.name}
        dogPhotoSrc={dogPhotoSrc}
        huntSlug={huntSlug}
        huntName={getHuntDisplayName(huntSlug, locale)}
        checkpoints={checkpoints}
        initialStep={progress.currentStep}
        initialCompleted={!!progress.completedAt}
        initialRouteVariant={routeVariant}
        initialDurationSeconds={progress.durationSeconds}
        initialUserRank={initialUserRank}
        hasSubmissions={hasSubmissions}
        canChangeRoute={canChangeRoute}
        routeChangeCheckpointIndex={routeChangeCheckpointIndex}
        durationMinutes={getDurationMinutes(huntSlug, routeVariant)}
        dogs={dogs}
        canUseTestMode={canUseTestMode}
      />
    </Suspense>
  );
}

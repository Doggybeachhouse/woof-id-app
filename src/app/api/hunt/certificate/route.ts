import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getHuntAdventure, ADVENTURE_FRAME_HEADLINE } from "@/lib/scavengerHunt/adventures";
import { getHuntCheckpoints } from "@/lib/scavengerHunt/checkpoints";
import { getActiveCheckpointIndices } from "@/lib/scavengerHunt/route";
import { getHuntDisplayName, parseRouteVariant } from "@/lib/scavengerHunt/hunts";
import { resolveHuntPhotoUrl } from "@/lib/scavengerHunt/resolvePhotoUrl";
import type { Locale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/serverAuth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  const { searchParams } = new URL(req.url);
  const dogId = searchParams.get("dogId")?.trim();
  const huntSlug = searchParams.get("huntSlug")?.trim();
  const completionId = searchParams.get("completionId")?.trim();
  const locale = (searchParams.get("locale")?.trim() ?? "nl") as Locale;

  if (!dogId || !huntSlug) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const checkpoints = getHuntCheckpoints(huntSlug);
  if (checkpoints.length === 0) {
    return NextResponse.json({ error: "Unknown hunt" }, { status: 404 });
  }

  const dog = await prisma.dogProfile.findUnique({
    where: { id: dogId },
    select: { id: true, name: true, ownerUserId: true },
  });
  if (!dog || (!isStaffRole(role) && dog.ownerUserId !== userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const progress = await prisma.scavengerHuntProgress.findUnique({
    where: { dogProfileId_huntSlug: { dogProfileId: dogId, huntSlug } },
    include: {
      submissions: { orderBy: { checkpointIndex: "asc" } },
    },
  });

  type SubmissionSnapshot = {
    checkpointIndex: number;
    imageUrl: string;
    lat: number;
    lng: number;
  };

  let routeVariant = parseRouteVariant(progress?.routeVariant);
  let submissionSnapshots: SubmissionSnapshot[] | null = null;
  let completedAt: Date | null = progress?.completedAt ?? null;
  let durationSeconds: number | null = progress?.durationSeconds ?? null;
  let progressIdForPhotos = progress?.id ?? "";

  if (completionId) {
    const completion = await prisma.scavengerHuntCompletion.findUnique({
      where: { id: completionId },
    });
    if (!completion || completion.dogProfileId !== dogId || completion.huntSlug !== huntSlug) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    routeVariant = parseRouteVariant(completion.routeVariant);
    submissionSnapshots = completion.submissions as SubmissionSnapshot[];
    completedAt = completion.completedAt;
    durationSeconds = completion.durationSeconds;
    progressIdForPhotos = progress?.id ?? completionId;
  } else if (!progress?.completedAt) {
    return NextResponse.json({ error: "Hunt not completed" }, { status: 400 });
  }

  const activeIndices = getActiveCheckpointIndices(huntSlug, routeVariant);

  const adventure = getHuntAdventure(huntSlug);
  const adventureLabel =
    adventure?.adventureLabel[locale] ??
    adventure?.adventureLabel.nl ??
    huntSlug;

  const photos = activeIndices.map((index) => {
    const cp = checkpoints[index]!;
    const fromArchive = submissionSnapshots?.find((s) => s.checkpointIndex === index);
    const fromProgress = progress?.submissions.find((s) => s.checkpointIndex === index);
    const submission = fromArchive ?? fromProgress;
    return {
      checkpointIndex: index,
      lat: fromArchive?.lat ?? cp.lat,
      lng: fromArchive?.lng ?? cp.lng,
      title: cp.title[locale] ?? cp.title.nl,
      photoUrl: submission
        ? resolveHuntPhotoUrl(submission.imageUrl, progressIdForPhotos, index)
        : null,
    };
  });

  if (!completionId && progress && progress.submissions.length < activeIndices.length) {
    return NextResponse.json({ error: "Missing checkpoint photos" }, { status: 400 });
  }

  const startPhotoUrl = photos[0]?.photoUrl ?? null;
  const photoUrls = photos.map((p) => p.photoUrl).filter((url): url is string => Boolean(url));
  const centerPhotoUrl =
    photoUrls.length > 0
      ? photoUrls[Math.floor(Math.random() * photoUrls.length)]!
      : startPhotoUrl;

  const routeName = adventure?.name[locale] ?? adventure?.name.nl ?? huntSlug;
  const huntName = getHuntDisplayName(huntSlug, locale);

  return NextResponse.json({
    progressId: progressIdForPhotos,
    dogName: dog.name,
    huntSlug,
    huntName,
    routeName,
    frameHeadline: ADVENTURE_FRAME_HEADLINE,
    adventureLabel,
    startPhotoUrl,
    centerPhotoUrl,
    photos,
    completedAt: completedAt!.toISOString(),
    durationSeconds,
  });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getHuntBySlug } from "@/lib/scavengerHunt/hunts";
import { canChangeRouteVariant } from "@/lib/scavengerHunt/route";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  dogId: z.string().min(1),
  huntSlug: z.string().min(1),
  routeVariant: z.enum(["full", "short"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { dogId, huntSlug, routeVariant } = parsed.data;

  const hunt = getHuntBySlug(huntSlug);
  if (!hunt) {
    return NextResponse.json({ error: "Unknown hunt" }, { status: 404 });
  }

  const dog = await prisma.dogProfile.findUnique({
    where: { id: dogId },
    select: { id: true, ownerUserId: true },
  });
  if (!dog || dog.ownerUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let progress = await prisma.scavengerHuntProgress.findUnique({
    where: { dogProfileId_huntSlug: { dogProfileId: dogId, huntSlug } },
    include: { submissions: true },
  });

  if (!progress) {
    progress = await prisma.scavengerHuntProgress.create({
      data: { dogProfileId: dogId, huntSlug, currentStep: 0, routeVariant },
      include: { submissions: true },
    });
    return NextResponse.json({ ok: true, routeVariant: progress.routeVariant });
  }

  if (progress.completedAt) {
    return NextResponse.json({ error: "hunt_completed" }, { status: 409 });
  }

  if (progress.routeVariant === routeVariant) {
    return NextResponse.json({ ok: true, routeVariant: progress.routeVariant });
  }

  if (
    !canChangeRouteVariant(
      huntSlug,
      progress.currentStep,
      progress.submissions,
      hunt,
    )
  ) {
    return NextResponse.json({ error: "route_locked" }, { status: 409 });
  }

  const updated = await prisma.scavengerHuntProgress.update({
    where: { id: progress.id },
    data: { routeVariant },
    select: { routeVariant: true },
  });

  return NextResponse.json({ ok: true, routeVariant: updated.routeVariant });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { resetHuntProgress } from "@/lib/scavengerHunt/completion";
import { getHuntBySlug } from "@/lib/scavengerHunt/hunts";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  dogId: z.string().min(1),
  huntSlug: z.string().min(1),
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

  const { dogId, huntSlug } = parsed.data;

  if (!getHuntBySlug(huntSlug)) {
    return NextResponse.json({ error: "Unknown hunt" }, { status: 404 });
  }

  const dog = await prisma.dogProfile.findUnique({
    where: { id: dogId },
    select: { id: true, ownerUserId: true },
  });
  if (!dog || dog.ownerUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const progress = await prisma.scavengerHuntProgress.findUnique({
    where: { dogProfileId_huntSlug: { dogProfileId: dogId, huntSlug } },
  });

  if (!progress?.completedAt) {
    return NextResponse.json({ error: "not_completed" }, { status: 409 });
  }

  await resetHuntProgress(progress.id);

  return NextResponse.json({ ok: true });
}

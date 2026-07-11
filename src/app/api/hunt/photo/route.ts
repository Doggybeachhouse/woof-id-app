import { readFile } from "fs/promises";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/serverAuth";
import path from "path";

const HUNT_DIR = path.join(process.cwd(), "data", "hunt");

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  const { searchParams } = new URL(req.url);
  const progressId = searchParams.get("progressId")?.trim();
  const checkpointIndexRaw = searchParams.get("checkpointIndex");

  if (!progressId || checkpointIndexRaw == null) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const checkpointIndex = Number.parseInt(checkpointIndexRaw, 10);
  if (!Number.isFinite(checkpointIndex) || checkpointIndex < 0) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const progress = await prisma.scavengerHuntProgress.findUnique({
    where: { id: progressId },
    include: {
      dog: { select: { ownerUserId: true } },
      submissions: {
        where: { checkpointIndex },
        take: 1,
      },
    },
  });

  if (!progress) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isStaffRole(role) && progress.dog.ownerUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submission = progress.submissions[0];
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const imageUrl = submission.imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return NextResponse.redirect(imageUrl, { status: 307 });
  }

  try {
    const buffer = await readFile(path.join(HUNT_DIR, imageUrl));
    const ext = imageUrl.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "heic"
            ? "image/heic"
            : "image/jpeg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}

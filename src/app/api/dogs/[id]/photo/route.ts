import { readFile } from "fs/promises";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getDogPhotoPath, isRemotePhotoRef } from "@/lib/dogs/storage";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/serverAuth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dog = await prisma.dogProfile.findUnique({
    where: { id },
    select: { photoUrl: true, ownerUserId: true },
  });
  if (!dog?.photoUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  if (!isStaffRole(role) && dog.ownerUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isRemotePhotoRef(dog.photoUrl)) {
    return NextResponse.redirect(dog.photoUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-cache" },
    });
  }

  try {
    const buffer = await readFile(getDogPhotoPath(dog.photoUrl));
    const ext = dog.photoUrl.split(".").pop()?.toLowerCase();
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
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}

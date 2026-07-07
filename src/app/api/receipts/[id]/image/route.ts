import { readFile } from "fs/promises";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getReceiptImagePath } from "@/lib/receipts/storage";
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

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { dog: { select: { ownerUserId: true } } },
  });
  if (!receipt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const canView =
    isStaffRole(role) || receipt.dog.ownerUserId === userId;
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!receipt.imageUrl) {
    return NextResponse.json({ error: "No image" }, { status: 404 });
  }

  try {
    const filePath = getReceiptImagePath(receipt.imageUrl);
    const buffer = await readFile(filePath);
    const ext = receipt.imageUrl.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
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

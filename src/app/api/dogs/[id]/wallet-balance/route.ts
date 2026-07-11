import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getWalletBalance } from "@/lib/mplus/balance";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/serverAuth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dogProfileId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  const dog = await prisma.dogProfile.findFirst({
    where: isStaffRole(role)
      ? { id: dogProfileId }
      : { id: dogProfileId, ownerUserId: userId },
    select: {
      walletLink: { select: { walletCardId: true } },
    },
  });

  if (!dog?.walletLink?.walletCardId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const view = await getWalletBalance(
    dog.walletLink.walletCardId,
    dogProfileId,
  );

  if (view.source === "live") {
    return NextResponse.json({
      source: "live" as const,
      balanceEur: view.balanceEur,
      active: view.active,
      validUntil: view.validUntil,
    });
  }

  if (view.source === "cache") {
    return NextResponse.json({
      source: "cache" as const,
      balanceEur: view.balanceEur,
    });
  }

  return NextResponse.json({
    source: "unavailable" as const,
    reason: view.reason,
  });
}

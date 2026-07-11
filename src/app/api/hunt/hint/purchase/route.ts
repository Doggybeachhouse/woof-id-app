import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  bindHuntHintReturnTokenOrder,
  buildHuntHintSuccessReturnUrl,
  createHuntHintReturnToken,
} from "@/lib/auth/huntHintReturnToken";
import { authOptions } from "@/lib/auth";
import { HUNT_HINT_PRICE_EUR } from "@/lib/scavengerHunt/constants";
import {
  createHuntHintPurchaseRecord,
  getHuntHintStatus,
} from "@/lib/scavengerHunt/hints";
import { prisma } from "@/lib/prisma";
import { startHuntHintPurchase } from "@/lib/wordpress/huntHint";

const bodySchema = z.object({
  dogId: z.string().min(1),
  huntSlug: z.string().min(1),
  checkpointIndex: z.coerce.number().int().min(0),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email?.trim().toLowerCase();

  if (!userId || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { dogId, huntSlug, checkpointIndex } = parsed.data;

  const dog = await prisma.dogProfile.findFirst({
    where: { id: dogId, ownerUserId: userId },
    select: { id: true },
  });
  if (!dog) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let progress = await prisma.scavengerHuntProgress.findUnique({
    where: { dogProfileId_huntSlug: { dogProfileId: dogId, huntSlug } },
  });
  if (!progress) {
    progress = await prisma.scavengerHuntProgress.create({
      data: { dogProfileId: dogId, huntSlug, currentStep: 0 },
    });
  }

  const status = await getHuntHintStatus({
    dogId,
    huntSlug,
    checkpointIndex,
    locale: "nl",
    userId,
  });
  if ("error" in status) {
    return NextResponse.json({ error: status.error }, { status: status.status });
  }
  if (status.revealed) {
    return NextResponse.json(
      { error: "already_revealed", hintText: status.hintText },
      { status: 409 },
    );
  }
  if (status.canUseFreeHint) {
    return NextResponse.json(
      { error: "use_free_hint_first", code: "free_available" },
      { status: 400 },
    );
  }

  let returnToken: string;
  try {
    ({ token: returnToken } = await createHuntHintReturnToken(
      userId,
      progress.id,
      checkpointIndex,
    ));
  } catch {
    return NextResponse.json(
      { error: "Kon geen veilige terugkeerlink maken.", code: "return_token_failed" },
      { status: 500 },
    );
  }

  const result = await startHuntHintPurchase({
    email,
    amountEur: HUNT_HINT_PRICE_EUR,
    progressId: progress.id,
    checkpointIndex,
    returnUrl: buildHuntHintSuccessReturnUrl(returnToken, dogId),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: 400 },
    );
  }

  if (result.orderId > 0) {
    await bindHuntHintReturnTokenOrder(returnToken, result.orderId);
    await createHuntHintPurchaseRecord({
      progressId: progress.id,
      checkpointIndex,
      orderId: result.orderId,
      amountEur: result.amountEur || Number(HUNT_HINT_PRICE_EUR),
    });
  }

  return NextResponse.json({
    checkoutUrl: result.checkoutUrl,
    orderId: result.orderId,
    amountEur: result.amountEur,
  });
}

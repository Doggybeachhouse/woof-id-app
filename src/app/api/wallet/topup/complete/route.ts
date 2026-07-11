import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/serverAuth";
import { recordWalletTopUp } from "@/lib/wallet/recordTopUp";
import { fetchTopUpPaymentStatus } from "@/lib/wordpress/topup";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  orderId: z.number().int().positive(),
  dogProfileId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  if (!userId || !email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { orderId, dogProfileId } = parsed.data;

  const dog = await prisma.dogProfile.findFirst({
    where: { id: dogProfileId, ownerUserId: userId },
    include: { walletLink: true },
  });
  if (!dog?.walletLink?.walletCardId) {
    return NextResponse.json({ error: "dog_not_found" }, { status: 404 });
  }

  const payment = await fetchTopUpPaymentStatus({ email, orderId });
  if (!payment?.paid) {
    return NextResponse.json({ error: "not_paid" }, { status: 402 });
  }
  if (payment.amountEur <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  try {
    const result = await recordWalletTopUp({
      dogProfileId,
      amountEur: payment.amountEur,
      registeredById: userId,
      note: "iDEAL top-up",
      wooOrderId: orderId,
    });

    return NextResponse.json({
      ok: true,
      alreadyRecorded: result.alreadyRecorded,
      newBalanceEur: result.newBalanceEur,
      topUpId: result.topUpId,
    });
  } catch (error) {
    console.error("[wallet/topup/complete] failed", {
      orderId,
      dogProfileId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "record_failed" }, { status: 500 });
  }
}

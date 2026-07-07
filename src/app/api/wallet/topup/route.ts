import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startWalletTopUp } from "@/lib/wordpress/topup";

const bodySchema = z.object({
  dogProfileId: z.string().min(1),
  amountEur: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email?.trim().toLowerCase();

  if (!userId || !email) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const dog = await prisma.dogProfile.findFirst({
    where: { id: parsed.data.dogProfileId, ownerUserId: userId },
    include: { walletLink: true },
  });

  if (!dog?.walletLink?.walletCardId) {
    return NextResponse.json(
      { error: "Koppel eerst een Woof Wallet aan deze hond." },
      { status: 400 },
    );
  }

  const appBase = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (!appBase) {
    return NextResponse.json(
      { error: "NEXTAUTH_URL ontbreekt in serverconfiguratie.", code: "not_configured" },
      { status: 500 },
    );
  }

  const result = await startWalletTopUp({
    email,
    barcode: dog.walletLink.walletCardId,
    amountEur: parsed.data.amountEur,
    returnUrl: `${appBase}/wallet/top-up/success`,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: 400 },
    );
  }

  return NextResponse.json({
    checkoutUrl: result.checkoutUrl,
    amountEur: result.amountEur,
  });
}

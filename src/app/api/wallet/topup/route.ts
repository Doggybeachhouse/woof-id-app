import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import {
  bindTopUpReturnTokenOrder,
  buildTopUpSuccessReturnUrl,
  createTopUpReturnToken,
} from "@/lib/auth/topupReturnToken";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isValidTopUpAmountCents,
  parseTopUpAmountEurToCents,
} from "@/lib/wallet/topupAmount";
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

  const amountCents = parseTopUpAmountEurToCents(parsed.data.amountEur);
  if (amountCents === null || !isValidTopUpAmountCents(amountCents)) {
    return NextResponse.json(
      { error: "Kies een bedrag tussen €1 en €500.", code: "invalid_amount" },
      { status: 400 },
    );
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

  let returnToken: string;
  try {
    ({ token: returnToken } = await createTopUpReturnToken(userId));
  } catch {
    return NextResponse.json(
      { error: "Kon geen veilige terugkeerlink maken.", code: "return_token_failed" },
      { status: 500 },
    );
  }

  const result = await startWalletTopUp({
    email,
    barcode: dog.walletLink.walletCardId,
    amountEur: parsed.data.amountEur,
    returnUrl: buildTopUpSuccessReturnUrl(returnToken),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: 400 },
    );
  }

  if (result.orderId > 0) {
    await bindTopUpReturnTokenOrder(returnToken, result.orderId);
  }

  return NextResponse.json({
    checkoutUrl: result.checkoutUrl,
    orderId: result.orderId,
    amountEur: result.amountEur,
  });
}

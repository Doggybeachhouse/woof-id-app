"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";
import {
  isValidTopUpAmountCents,
  parseTopUpAmountEurToCents,
} from "@/lib/wallet/topupAmount";
import { startWalletTopUp } from "@/lib/wordpress/topup";

export type TopUpFormState = {
  error?: string;
  code?: string;
  checkoutUrl?: string;
  orderId?: number;
};

export async function startWalletTopUpAction(
  _prev: TopUpFormState,
  formData: FormData,
): Promise<TopUpFormState> {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const email = session.user?.email?.trim().toLowerCase() ?? "";

  const dogProfileId = String(formData.get("dogProfileId") ?? "").trim();
  const customAmount = String(formData.get("amountEurCustom") ?? "").trim();
  const presetAmount = String(formData.get("amountEur") ?? "").trim();
  const amountEur = presetAmount || customAmount;

  if (!dogProfileId || !amountEur) {
    return { error: "Kies een bedrag.", code: "invalid_amount" };
  }

  const amountCents = parseTopUpAmountEurToCents(amountEur);
  if (amountCents === null || !isValidTopUpAmountCents(amountCents)) {
    return {
      error: "Kies een bedrag tussen €1 en €500.",
      code: "invalid_amount",
    };
  }

  const dog = await prisma.dogProfile.findFirst({
    where: { id: dogProfileId, ownerUserId: userId },
    include: { walletLink: true },
  });

  if (!dog?.walletLink?.walletCardId) {
    return {
      error: "Koppel eerst een Woof Wallet aan deze hond.",
      code: "wwm_no_barcode",
    };
  }

  const result = await startWalletTopUp({
    email,
    barcode: dog.walletLink.walletCardId,
    amountEur,
    returnUrl: `${process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? ""}/wallet/top-up/success`,
  });

  if (!result.ok) {
    console.error("[wallet/top-up] WordPress top-up failed", {
      code: result.code,
      email,
      dogProfileId,
      barcode: dog.walletLink.walletCardId,
      error: result.error,
    });
    return { error: result.error, code: result.code };
  }

  return { checkoutUrl: result.checkoutUrl, orderId: result.orderId };
}

"use server";

import {
  bindTopUpReturnTokenOrder,
  buildTopUpSuccessReturnUrl,
  createTopUpReturnToken,
} from "@/lib/auth/topupReturnToken";
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

  let returnToken: string;
  try {
    ({ token: returnToken } = await createTopUpReturnToken(userId));
  } catch (error) {
    console.error("[wallet/top-up] Failed to create return token", error);
    return {
      error: "Kon geen veilige terugkeerlink maken. Probeer het opnieuw.",
      code: "return_token_failed",
    };
  }

  const result = await startWalletTopUp({
    email,
    barcode: dog.walletLink.walletCardId,
    amountEur,
    returnUrl: buildTopUpSuccessReturnUrl(returnToken),
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

  if (result.orderId > 0) {
    await bindTopUpReturnTokenOrder(returnToken, result.orderId);
  }

  return { checkoutUrl: result.checkoutUrl, orderId: result.orderId };
}

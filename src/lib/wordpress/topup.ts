import { isWordPressBridgeEnabled, wordPressPost } from "@/lib/wordpress/client";

export type StartWalletTopUpInput = {
  email: string;
  barcode: string;
  amountEur: string;
  returnUrl?: string;
};

export type StartWalletTopUpResult =
  | { ok: true; checkoutUrl: string; amountEur: number; barcode: string }
  | { ok: false; error: string; code?: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Ongeldig e-mailadres.",
  invalid_barcode: "Ongeldige Woof Wallet barcode.",
  invalid_amount: "Kies een bedrag tussen €0,01 en €500.",
  barcode_not_found: "Geen Woof Wallet gevonden voor deze barcode.",
  no_webshop_account:
    "Je webshop-account kon niet worden gevonden. Neem contact op met Doggy Beach House.",
  wwm_no_barcode: "Koppel eerst je Woof Wallet barcode.",
  wwm_no_product: "Opwaarderen is nog niet ingesteld in de webshop.",
};

export async function startWalletTopUp(
  input: StartWalletTopUpInput,
): Promise<StartWalletTopUpResult> {
  if (!isWordPressBridgeEnabled()) {
    return {
      ok: false,
      error: "Woof Wallet koppeling is nog niet ingesteld (API secret).",
      code: "not_configured",
    };
  }

  const result = await wordPressPost<{
    checkout_url?: string;
    amount_eur?: number;
    barcode?: string;
  }>("/woof-id/topup", {
    email: input.email.trim().toLowerCase(),
    barcode: input.barcode.trim(),
    amount_eur: input.amountEur,
    return_url: input.returnUrl?.trim() || undefined,
  });

  if (!result.ok) {
    const code = result.error ?? "unknown";
    return {
      ok: false,
      code,
      error:
        result.message ??
        ERROR_MESSAGES[code] ??
        "Opwaarderen starten mislukt. Probeer het later opnieuw.",
    };
  }

  const checkoutUrl =
    typeof result.checkout_url === "string" ? result.checkout_url.trim() : "";
  if (!checkoutUrl) {
    return {
      ok: false,
      code: "no_checkout_url",
      error: "Geen checkout-link ontvangen van de webshop.",
    };
  }

  return {
    ok: true,
    checkoutUrl,
    amountEur: Number(result.amount_eur ?? 0),
    barcode: result.barcode ?? input.barcode,
  };
}

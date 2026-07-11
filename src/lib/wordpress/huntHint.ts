import { isWordPressBridgeEnabled, wordPressPost } from "@/lib/wordpress/client";

export type StartHuntHintPurchaseInput = {
  email: string;
  amountEur: string;
  progressId: string;
  checkpointIndex: number;
  returnUrl?: string;
};

export type StartHuntHintPurchaseResult =
  | {
      ok: true;
      checkoutUrl: string;
      orderId: number;
      amountEur: number;
    }
  | { ok: false; error: string; code?: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Ongeldig e-mailadres.",
  invalid_amount: "Ongeldig hintbedrag.",
  no_webshop_account:
    "Je webshop-account kon niet worden gevonden. Neem contact op met Doggy Beach House.",
  wwm_no_product: "Hint-aankoop is nog niet ingesteld in de webshop.",
  wwm_no_cart: "Kon de winkelwagen niet laden. Probeer het opnieuw.",
  wwm_cart_add_failed: "Kon het hintproduct niet toevoegen. Probeer het opnieuw.",
  woocommerce_missing:
    "WooCommerce is niet beschikbaar op de webshop. Neem contact op met Doggy Beach House.",
  auth_failed:
    "Webshop-koppeling geweigerd. Neem contact op met Doggy Beach House.",
  rest_no_route:
    "Hint-aankoop is niet beschikbaar op de webshop. Controleer of Woof ID Bridge actief is.",
  network_error: "Kon de webshop niet bereiken. Probeer het later opnieuw.",
  no_checkout_url: "Geen betaallink ontvangen van de webshop.",
  webshop_server_error:
    "De webshop gaf een technische fout bij hint-aankoop. Neem contact op met Doggy Beach House.",
  internal_server_error:
    "De webshop gaf een technische fout bij hint-aankoop. Neem contact op met Doggy Beach House.",
  unknown: "Hint-aankoop starten mislukt. Probeer het later opnieuw.",
};

const GENERIC_ERROR = "Hint-aankoop starten mislukt. Probeer het later opnieuw.";

function userFacingError(code: string, message?: string): string {
  if (ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  const stripped = message?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (stripped && stripped.length <= 180) {
    return stripped;
  }

  return GENERIC_ERROR;
}

export async function startHuntHintPurchase(
  input: StartHuntHintPurchaseInput,
): Promise<StartHuntHintPurchaseResult> {
  if (!isWordPressBridgeEnabled()) {
    return {
      ok: false,
      error: "Webshop-koppeling is nog niet ingesteld (API secret).",
      code: "not_configured",
    };
  }

  const result = await wordPressPost<{
    checkout_url?: string;
    order_id?: number;
    amount_eur?: number;
  }>("/woof-id/hunt-hint", {
    email: input.email.trim().toLowerCase(),
    amount_eur: input.amountEur,
    progress_id: input.progressId,
    checkpoint_index: input.checkpointIndex,
    return_url: input.returnUrl?.trim() || undefined,
  });

  if (!result.ok) {
    const code = result.error ?? "unknown";
    return {
      ok: false,
      code,
      error: userFacingError(code, result.message),
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
    orderId: Number(result.order_id ?? 0),
    amountEur: Number(result.amount_eur ?? 0),
  };
}

export async function fetchHuntHintPaymentStatus(input: {
  email: string;
  orderId: number;
}): Promise<{ paid: boolean; amountEur: number } | null> {
  if (!isWordPressBridgeEnabled() || input.orderId <= 0) {
    return null;
  }

  const result = await wordPressPost<{
    paid?: boolean;
    amount_eur?: number;
  }>("/woof-id/hunt-hint/status", {
    email: input.email.trim().toLowerCase(),
    order_id: input.orderId,
  });

  if (!result.ok) {
    return null;
  }

  return {
    paid: Boolean(result.paid),
    amountEur: Number(result.amount_eur ?? 0),
  };
}

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
  invalid_amount: "Kies een bedrag tussen €1 en €500.",
  barcode_not_found: "Geen Woof Wallet gevonden voor deze barcode.",
  no_webshop_account:
    "Je webshop-account kon niet worden gevonden. Neem contact op met Doggy Beach House.",
  wwm_no_barcode: "Koppel eerst je Woof Wallet barcode.",
  wwm_no_product: "Opwaarderen is nog niet ingesteld in de webshop.",
  wwm_no_cart: "Kon de winkelwagen niet laden. Probeer het opnieuw.",
  wwm_cart_add_failed:
    "Kon het opwaardeerproduct niet toevoegen. Probeer het opnieuw.",
  wallet_plugin_missing:
    "Woof Wallet is niet actief op de webshop. Neem contact op met Doggy Beach House.",
  woocommerce_missing:
    "WooCommerce is niet beschikbaar op de webshop. Neem contact op met Doggy Beach House.",
  auth_failed:
    "Webshop-koppeling geweigerd. Neem contact op met Doggy Beach House.",
  rest_no_route:
    "Opwaarderen is niet beschikbaar op de webshop. Controleer of Woof Wallet en Woof ID Bridge actief zijn.",
  network_error: "Kon de webshop niet bereiken. Probeer het later opnieuw.",
  no_checkout_url: "Geen betaallink ontvangen van de webshop.",
  wwm_remote_checkout_missing:
    "Opwaarderen via de app vereist een update van de Woof Wallet-plugin op doggybeachhouse.com. Neem contact op met Doggy Beach House.",
  webshop_server_error:
    "De webshop gaf een technische fout bij opwaarderen. Waarschijnlijk moet de Woof Wallet-plugin worden bijgewerkt — neem contact op met Doggy Beach House.",
  internal_server_error:
    "De webshop gaf een technische fout bij opwaarderen. Neem contact op met Doggy Beach House.",
  unknown: "Opwaarderen starten mislukt. Probeer het later opnieuw.",
};

const GENERIC_ERROR =
  "Opwaarderen starten mislukt. Probeer het later opnieuw.";

function userFacingTopUpError(code: string, message?: string): string {
  if (ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  const sanitized = sanitizeRemoteMessage(message);
  if (sanitized) {
    return sanitized;
  }

  return GENERIC_ERROR;
}

function sanitizeRemoteMessage(message?: string): string | undefined {
  if (!message) return undefined;

  const stripped = message
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return undefined;

  // Hide raw HTML, stack traces, and other technical dumps from users.
  if (
    stripped.length > 180 ||
    /<(html|body|!doctype)\b/i.test(message) ||
    /\b(stack trace|fatal error|wpdb|sqlstate)\b/i.test(stripped)
  ) {
    return undefined;
  }

  return stripped;
}

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
      error: userFacingTopUpError(code, result.message),
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

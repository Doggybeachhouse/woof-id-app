import {
  isWordPressBridgeEnabled,
  type WordPressApiResponse,
  wordPressPost,
} from "@/lib/wordpress/client";

function isBridgeUnavailable(
  result: Extract<WordPressApiResponse<Record<string, unknown>>, { ok: false }>,
) {
  return (
    result.status === 404 ||
    result.error === "rest_no_route" ||
    result.message?.includes("No route was found") === true
  );
}

const REGISTER_ERRORS: Record<string, string> = {
  invalid_email: "Ongeldig e-mailadres.",
  invalid_password: "Wachtwoord moet minimaal 8 tekens zijn.",
  email_exists:
    "Dit e-mailadres is al in gebruik op doggybeachhouse.com. Gebruik hetzelfde wachtwoord als daar, of reset het via de webshop.",
  email_in_use_woof_id:
    "Dit e-mailadres is al geregistreerd bij Woof ID. Log in in plaats van opnieuw te registreren.",
  create_failed: "Account aanmaken op doggybeachhouse.com mislukt.",
  woocommerce_missing: "Webshop is nog niet beschikbaar.",
  not_configured: "Webshop-koppeling is niet ingesteld.",
};

const SYNC_ERRORS: Record<string, string> = {
  user_not_found: "Geen webshop-account gevonden voor dit e-mailadres.",
  invalid_password: "Wachtwoord moet minimaal 8 tekens zijn.",
  email_taken: "Dit e-mailadres is al in gebruik op doggybeachhouse.com.",
  password_mismatch: "Wachtwoord is onjuist.",
  invalid_email: "Ongeldig e-mailadres.",
};

export type RegisterWebshopAccountInput = {
  email: string;
  password: string;
  name?: string;
};

export async function checkWebshopEmail(
  email: string,
): Promise<{ exists: boolean }> {
  if (!isWordPressBridgeEnabled()) {
    return { exists: false };
  }

  const result = await wordPressPost<{ exists?: boolean }>("/woof-id/check-email", {
    email: email.trim().toLowerCase(),
  });

  if (!result.ok) {
    return { exists: false };
  }

  return { exists: Boolean(result.exists) };
}

export async function registerWebshopAccount(
  input: RegisterWebshopAccountInput,
): Promise<
  | { ok: true; created: boolean; linked: boolean }
  | { ok: false; error: string; code?: string }
> {
  if (!isWordPressBridgeEnabled()) {
    return { ok: true, created: false, linked: false };
  }

  const result = await wordPressPost<{
    created?: boolean;
    linked?: boolean;
  }>("/woof-id/register", {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    name: input.name?.trim() ?? "",
  });

  if (!result.ok) {
    if (isBridgeUnavailable(result)) {
      return { ok: true, created: false, linked: false };
    }

    return {
      ok: false,
      code: result.error,
      error:
        result.message ??
        REGISTER_ERRORS[result.error] ??
        "Koppeling met doggybeachhouse.com mislukt.",
    };
  }

  return {
    ok: true,
    created: Boolean(result.created),
    linked: Boolean(result.linked),
  };
}

export async function syncWebshopPassword(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isWordPressBridgeEnabled()) return { ok: true };

  const result = await wordPressPost<Record<string, never>>("/woof-id/sync-password", {
    email: email.trim().toLowerCase(),
    password,
  });

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.message ??
        SYNC_ERRORS[result.error] ??
        "Wachtwoord synchroniseren met de webshop mislukt.",
    };
  }

  return { ok: true };
}

export async function syncWebshopEmail(
  oldEmail: string,
  newEmail: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isWordPressBridgeEnabled()) return { ok: true };

  const result = await wordPressPost<Record<string, never>>("/woof-id/sync-email", {
    old_email: oldEmail.trim().toLowerCase(),
    new_email: newEmail.trim().toLowerCase(),
    password,
  });

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.message ??
        SYNC_ERRORS[result.error] ??
        "E-mail synchroniseren met de webshop mislukt.",
    };
  }

  return { ok: true };
}

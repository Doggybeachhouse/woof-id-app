export function getWordPressStoreUrl() {
  return (
    process.env.WOOF_WALLET_STORE_URL?.trim() ||
    "https://doggybeachhouse.com"
  ).replace(/\/$/, "");
}

export function getWordPressApiSecret() {
  return process.env.WOOF_WALLET_API_SECRET?.trim() ?? "";
}

export function isWordPressBridgeEnabled() {
  return getWordPressApiSecret() !== "";
}

export type WordPressApiResponse<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string; message?: string; status?: number };

export async function wordPressPost<T extends Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<WordPressApiResponse<T>> {
  const secret = getWordPressApiSecret();
  if (!secret) {
    return {
      ok: false,
      error: "not_configured",
      message: "Webshop-koppeling is niet ingesteld.",
    };
  }

  let res: Response;
  try {
    res = await fetch(`${getWordPressStoreUrl()}/wp-json/wwm/v1${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Woof-Id-Secret": secret,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      error: "network_error",
      message: "Kon de webshop niet bereiken. Probeer het later opnieuw.",
    };
  }

  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
    message?: string;
  };

  if (!res.ok) {
    const authFailed = res.status === 401 || res.status === 403;
    const wpCode = typeof data.code === "string" ? data.code : "";
    const wpError = typeof data.error === "string" ? data.error : "";
    const errorCode =
      wpError ||
      (authFailed && wpCode === "rest_forbidden" ? "auth_failed" : wpCode) ||
      "unknown";

    console.error("[wordpress] API request failed", {
      path,
      status: res.status,
      code: errorCode,
      wpCode: wpCode || undefined,
      message: data.message,
    });

    return {
      ok: false,
      error: authFailed ? "auth_failed" : errorCode,
      message:
        data.message ??
        (authFailed
          ? "Webshop-koppeling geweigerd. Controleer het API-secret."
          : undefined),
      status: res.status,
    };
  }

  return { ok: true, ...data };
}

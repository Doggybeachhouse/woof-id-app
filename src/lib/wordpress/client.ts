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

  const res = await fetch(`${getWordPressStoreUrl()}/wp-json/wwm/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Woof-Id-Secret": secret,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    const authFailed = res.status === 401 || res.status === 403;
    return {
      ok: false,
      error: authFailed ? "auth_failed" : (data.error ?? "unknown"),
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

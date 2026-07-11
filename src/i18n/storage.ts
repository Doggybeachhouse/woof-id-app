import {
  isLocale,
  localeCookie,
  localeCookieMaxAge,
  localeStorageKey,
  type Locale,
} from "@/i18n/config";

function cookieSecureSuffix(): string {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? ";Secure" : "";
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;

  try {
    const fromStorage = localStorage.getItem(localeStorageKey);
    if (isLocale(fromStorage)) return fromStorage;
  } catch {
    // localStorage may be blocked in private mode
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${localeCookie.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  const fromCookie = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isLocale(fromCookie) ? fromCookie : null;
}

export function writeLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookie}=${locale};path=/;max-age=${localeCookieMaxAge};SameSite=Lax${cookieSecureSuffix()}`;
}

export function persistLocale(locale: Locale) {
  writeLocaleCookie(locale);
  try {
    localStorage.setItem(localeStorageKey, locale);
  } catch {
    // ignore quota / private mode
  }
  document.documentElement.lang = locale;
}

export function persistLocaleOnServer(locale: Locale) {
  void fetch("/api/locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // client cookie + localStorage already updated
  });
}

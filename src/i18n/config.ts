export const locales = ["nl", "de", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "nl";
export const localeCookie = "woof_locale";
export const localeStorageKey = "woof_locale";
/** 1 year — keep in sync with cookie max-age in storage + API routes */
export const localeCookieMaxAge = 60 * 60 * 24 * 365;

export const localeLabels: Record<Locale, string> = {
  nl: "NL",
  de: "DE",
  en: "EN",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}

export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;

  const header = (acceptLanguage ?? "").toLowerCase();
  if (header.includes("de")) return "de";
  if (header.includes("en")) return "en";
  return defaultLocale;
}

export const luxonLocales: Record<Locale, string> = {
  nl: "nl",
  de: "de",
  en: "en-GB",
};

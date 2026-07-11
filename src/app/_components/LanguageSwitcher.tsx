"use client";

import { localeLabels, locales, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

type Props = {
  size?: "default" | "large";
};

export function LanguageSwitcher({ size = "default" }: Props) {
  const { locale, t, setLocale } = useI18n();
  const isLarge = size === "large";

  return (
    <div
      className={`flex items-center rounded-full border border-black/10 bg-white/90 shrink-0 shadow-sm pointer-events-auto ${
        isLarge ? "p-1" : "p-0.5"
      }`}
      role="group"
      aria-label={t("language.label")}
    >
      {locales.map((code) => {
        const active = locale === code;
        const className = `font-bold rounded-full transition-colors touch-manipulation ${
          isLarge
            ? "px-4 py-2 text-sm min-w-[3rem] text-center"
            : "px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px]"
        } ${
          active
            ? "bg-[var(--accent-pink)] text-white"
            : "text-[var(--foreground-muted)] hover:text-black"
        }`;

        if (active) {
          return (
            <span key={code} className={className} aria-current="true">
              {localeLabels[code as Locale]}
            </span>
          );
        }

        return (
          <button
            key={code}
            type="button"
            className={className}
            onClick={() => setLocale(code)}
          >
            {localeLabels[code as Locale]}
          </button>
        );
      })}
    </div>
  );
}

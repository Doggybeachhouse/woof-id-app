"use client";

import { useSession } from "next-auth/react";

import { useI18n } from "@/i18n/client";

export function AppFooter() {
  const { data: session } = useSession();
  const { t } = useI18n();

  if (!session?.user) return null;

  return (
    <footer className="app-footer mt-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-[var(--foreground-muted)]">
        <a
          href="https://www.doggybeachhouse.com"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          {t("nav.footer.website")}
        </a>
        <span className="mx-2">·</span>
        <span className="footer-brand font-display text-sm">
          {t("nav.footer.brandLine")}
        </span>
      </div>
    </footer>
  );
}

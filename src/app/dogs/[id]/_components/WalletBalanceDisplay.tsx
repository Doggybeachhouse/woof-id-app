"use client";

import { DateTime } from "luxon";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";
import { luxonLocales } from "@/i18n/config";

const POLL_INTERVAL_MS = 120_000;

type WalletBalanceApiLive = {
  source: "live";
  balanceEur: number;
  active: boolean;
  validUntil: string | null;
};

type WalletBalanceApiCache = {
  source: "cache";
  balanceEur: number;
};

type WalletBalanceApiUnavailable = {
  source: "unavailable";
  reason: string;
};

type WalletBalanceApiResponse =
  | WalletBalanceApiLive
  | WalletBalanceApiCache
  | WalletBalanceApiUnavailable;

export type WalletBalanceDisplayState = {
  balanceEur: number | null;
  source: "live" | "cache" | "unavailable";
  active?: boolean;
  validUntil?: string | null;
};

type WalletBalanceDisplayProps = {
  dogId: string;
  initial: WalletBalanceDisplayState;
};

export function WalletBalanceDisplay({
  dogId,
  initial,
}: WalletBalanceDisplayProps) {
  const { t, locale } = useI18n();
  const [view, setView] = useState(initial);

  useEffect(() => {
    let cancelled = false;

    async function refresh(): Promise<void> {
      try {
        const response = await fetch(`/api/dogs/${dogId}/wallet-balance`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) {
          return;
        }

        const data = (await response.json()) as WalletBalanceApiResponse;
        if (cancelled) {
          return;
        }

        if (data.source === "live") {
          setView({
            balanceEur: data.balanceEur,
            source: "live",
            active: data.active,
            validUntil: data.validUntil,
          });
          return;
        }

        if (data.source === "cache") {
          setView((prev) => ({
            balanceEur: data.balanceEur,
            source: "cache",
            active: prev.active,
            validUntil: prev.validUntil,
          }));
          return;
        }

        setView((prev) =>
          prev.balanceEur != null
            ? prev
            : { balanceEur: null, source: "unavailable" },
        );
      } catch {
        // Keep showing last known balance when poll fails.
      }
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [dogId]);

  const hasDisplayBalance =
    view.source === "live" || view.source === "cache";

  if (!hasDisplayBalance) {
    return (
      <p className="font-display text-3xl mt-1 text-[var(--accent-primary)]">
        {t("dogs.detail.balanceUnavailable")}
      </p>
    );
  }

  return (
    <>
      <p className="font-display text-3xl mt-1 text-[var(--accent-primary)]">
        €{view.balanceEur!.toFixed(2)}
      </p>
      {view.source === "live" && view.active === false && (
        <p className="text-sm text-amber-700 mt-1">
          {t("dogs.detail.balanceInactive")}
        </p>
      )}
      {view.source === "live" && view.validUntil && (
        <p className="text-sm text-[var(--foreground-muted)] mt-1">
          {t("dogs.detail.balanceValidUntil", {
            date: DateTime.fromISO(view.validUntil)
              .setLocale(luxonLocales[locale])
              .toFormat("d MMMM yyyy"),
          })}
        </p>
      )}
    </>
  );
}

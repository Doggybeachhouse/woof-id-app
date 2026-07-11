import Link from "next/link";
import { DateTime } from "luxon";

import {
  WalletHistoryList,
  type WalletHistoryEntryView,
} from "@/app/dogs/[id]/_components/WalletHistoryList";
import { WalletBalanceDisplay } from "@/app/dogs/[id]/_components/WalletBalanceDisplay";
import { getTranslations } from "@/i18n/server";
import { luxonLocales } from "@/i18n/config";
import { getWalletBalance } from "@/lib/mplus/balance";

type WalletBalanceSectionProps = {
  dogId: string;
  walletCardId: string | null;
  isOwner: boolean;
};

export async function WalletBalanceSection({
  dogId,
  walletCardId,
  isOwner,
}: WalletBalanceSectionProps) {
  const { t, locale } = await getTranslations();

  const walletBalance = walletCardId
    ? await getWalletBalance(walletCardId, dogId)
    : null;

  function walletHistoryLabel(result: string): string {
    const key = `dogs.detail.walletHistoryTypes.${result}`;
    const translated = t(key);
    return translated === key ? result : translated;
  }


  const initialBalance =
    walletBalance?.source === "live" || walletBalance?.source === "cache"
      ? {
          balanceEur: walletBalance.balanceEur,
          source: walletBalance.source,
          ...(walletBalance.source === "live"
            ? {
                active: walletBalance.active,
                validUntil: walletBalance.validUntil,
              }
            : {}),
        }
      : { balanceEur: null, source: "unavailable" as const };

  return (
    <section className="card wallet-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">{t("dogs.detail.woofWallet")}</h2>
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
          {t("dogs.detail.prepaid")}
        </span>
      </div>

      {walletCardId ? (
        <>
          <div className="wallet-card__balance-block">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              {t("dogs.detail.cardNumber")}
            </p>
            <p className="font-mono text-lg tracking-wide mt-1">{walletCardId}</p>
          </div>
          <div className="wallet-card__balance-block">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              {t("dogs.detail.balanceLabel")}
            </p>
            <WalletBalanceDisplay dogId={dogId} initial={initialBalance} />
          </div>
          {isOwner && (
            <Link
              href={`/wallet/top-up?dog=${dogId}`}
              className="btn btn-primary w-full text-base"
            >
              {t("dogs.detail.topUp")}
            </Link>
          )}
          {walletBalance?.source === "live" &&
            walletBalance.history.length > 0 && (
            <WalletHistoryList
              entries={walletBalance.history.map((entry, index): WalletHistoryEntryView => {
                const when = entry.dateTime ?? entry.bookDate;
                const formattedWhen = when
                  ? DateTime.fromISO(when)
                      .setLocale(luxonLocales[locale])
                      .toFormat("d MMM yyyy, HH:mm")
                  : t("dogs.detail.walletHistoryUnknownDate");
                const amountLabel =
                  entry.bookingAmountEur >= 0
                    ? `+€${entry.bookingAmountEur.toFixed(2)}`
                    : `-€${Math.abs(entry.bookingAmountEur).toFixed(2)}`;

                return {
                  key: `${entry.result}-${entry.dateTime ?? entry.bookDate ?? index}`,
                  label: walletHistoryLabel(entry.result),
                  when: formattedWhen,
                  amountLabel,
                };
              })}
            />
          )}
          {isOwner && (
            <Link
              href={`/dogs/${dogId}/edit`}
              className="btn btn-ghost text-sm w-full"
            >
              {t("dogs.detail.editWalletOrProfile")}
            </Link>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
            {t("dogs.detail.noWalletLinked")}
          </p>
          {isOwner && (
            <Link
              href={`/dogs/${dogId}/edit`}
              className="btn btn-primary w-full"
            >
              {t("dogs.detail.linkWallet")}
            </Link>
          )}
        </>
      )}
    </section>
  );
}

export function WalletBalanceSkeleton() {
  return (
    <section className="card wallet-card p-5 space-y-4" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-2">
        <div className="skeleton skeleton--text skeleton--lg w-32" />
        <div className="skeleton skeleton--text w-16" />
      </div>
      <div className="space-y-2">
        <div className="skeleton skeleton--text w-24" />
        <div className="skeleton skeleton--text skeleton--lg w-40" />
      </div>
      <div className="space-y-2">
        <div className="skeleton skeleton--text w-20" />
        <div className="skeleton skeleton--text skeleton--xl w-28" />
      </div>
    </section>
  );
}

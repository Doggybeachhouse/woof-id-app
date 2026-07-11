import Link from "next/link";
import { redirect } from "next/navigation";

import { ActiveVouchersList } from "@/app/rewards/_components/ActiveVouchersList";
import { RewardRedeemButton } from "@/app/rewards/_components/RewardRedeemButton";
import { RewardsDogSelect } from "@/app/rewards/_components/RewardsDogSelect";
import { getTranslations } from "@/i18n/server";
import { nextReward, WOOF_REWARDS } from "@/lib/gamification/rewards";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ dog?: string }>;
}) {
  const { t } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const { dog: selectedDogId } = await searchParams;

  const dogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, woofId: true, woofCoins: true },
  });

  if (dogs.length === 0) redirect("/dogs/new");

  const activeDog =
    dogs.find((d) => d.id === selectedDogId) ?? dogs[0]!;
  const balance = activeDog.woofCoins;
  const upcoming = nextReward(balance);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <p className="eyebrow">{t("rewards.page.eyebrow")}</p>
        <h1 className="font-display text-4xl leading-tight">{t("rewards.page.title")}</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-2">
          {t("rewards.page.description")}
        </p>
      </div>

      <div className="card-luxe p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              {t("rewards.page.balance")}
            </p>
            {dogs.length > 1 ? (
              <RewardsDogSelect dogs={dogs} activeDogId={activeDog.id} />
            ) : (
              <p className="font-display text-xl mt-1">{activeDog.name}</p>
            )}
          </div>
          <div className="text-right">
            <p className="coin-badge text-2xl px-4 py-2">🪙 {balance}</p>
            <p className="text-xs text-[var(--foreground-muted)] mt-1 font-mono">{activeDog.woofId}</p>
          </div>
        </div>
        {upcoming && (
          <p className="text-sm text-[var(--foreground-muted)] mt-4 pt-4 border-t border-[var(--card-border)]">
            {t("rewards.page.coinsUntil", {
              coins: upcoming.coins - balance,
              rewardTitle: t(`rewards.items.${upcoming.id}.title`),
              icon: upcoming.icon,
            })}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">{t("rewards.vouchers.title")}</h2>
        <ActiveVouchersList dogProfileId={activeDog.id} />
      </section>

      <div className="space-y-4">
        {WOOF_REWARDS.map((reward) => {
          const canAfford = balance >= reward.coins;
          const progress = Math.min(100, Math.round((balance / reward.coins) * 100));

          return (
            <article
              key={reward.id}
              className={`card p-5 space-y-3 transition-shadow ${
                canAfford
                  ? "border-[var(--accent-pink)]/35 ring-1 ring-[var(--accent-pink)]/15"
                  : "opacity-95"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl shrink-0" aria-hidden>
                  {reward.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl">{t(`rewards.items.${reward.id}.title`)}</h2>
                    <span className="coin-badge text-sm">🪙 {reward.coins}</span>
                    {canAfford && (
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--accent-pink)] bg-[var(--accent-pink)]/10 px-2 py-0.5 rounded-full">
                        {t("rewards.page.available")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--foreground-muted)] mt-1">{t(`rewards.items.${reward.id}.description`)}</p>
                  {reward.terms && (
                    <p className="text-xs text-[var(--foreground-muted)]/70 mt-2">{t(`rewards.items.${reward.id}.terms`)}</p>
                  )}
                </div>
              </div>

              {!canAfford && (
                <div>
                  <div className="h-2 rounded-full bg-[var(--card-border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent-yellow)] to-[var(--accent-pink)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    {t("rewards.page.progress", { balance, required: reward.coins })}
                  </p>
                </div>
              )}

              {canAfford && (
                <RewardRedeemButton dogId={activeDog.id} reward={reward} />
              )}
            </article>
          );
        })}
      </div>

      <div className="card p-4 text-sm text-[var(--foreground-muted)] space-y-2">
        <p className="font-semibold text-[var(--foreground)]">{t("rewards.page.howItWorksTitle")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("rewards.page.howItWorks1")}</li>
          <li>{t("rewards.page.howItWorks2")}</li>
          <li>{t("rewards.page.howItWorks3")}</li>
          <li>{t("rewards.page.howItWorks4")}</li>
          <li>{t("rewards.page.howItWorks5")}</li>
        </ul>
      </div>

      <p className="text-center text-sm">
        <Link href={`/dogs/${activeDog.id}`} className="underline text-[var(--accent-brown)] hover:text-[var(--accent-pink)]">
          {t("rewards.page.backToDog", { dogName: activeDog.name })}
        </Link>
      </p>
    </div>
  );
}

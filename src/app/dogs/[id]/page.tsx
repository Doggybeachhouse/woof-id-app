import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { Suspense } from "react";

import { AchievementsGrid } from "@/app/dogs/[id]/_components/AchievementsGrid";
import { DogProductsSection } from "@/app/dogs/[id]/_components/DogProductsSection";
import { ActiveVouchersList } from "@/app/rewards/_components/ActiveVouchersList";
import {
  WalletBalanceSection,
  WalletBalanceSkeleton,
} from "@/app/dogs/[id]/_components/WalletBalanceSection";
import { getTranslations } from "@/i18n/server";
import { luxonLocales } from "@/i18n/config";
import { dogPhotoApiSrc } from "@/lib/dogs/photoUrl";
import { getAchievementLabels } from "@/lib/gamification/achievementLabels";
import { evaluateDogAchievements } from "@/lib/gamification/processDogEvent";
import { syncWalletPurchasesForDog } from "@/lib/mplus/syncWalletPurchases";
import { getFavoriteProducts, getRecentPurchaseItems } from "@/lib/receipts/favoriteProducts";
import { requireUser, isStaffRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function DogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getTranslations();
  const { id } = await params;
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const staff = isStaffRole(role);
  const isOwner = !staff;

  const dogExists = await prisma.dogProfile.findFirst({
    where: staff ? { id } : { id, ownerUserId: userId },
    select: {
      id: true,
      walletLink: { select: { walletCardId: true } },
    },
  });

  if (!dogExists) notFound();

  if (dogExists.walletLink?.walletCardId) {
    await syncWalletPurchasesForDog(id, dogExists.walletLink.walletCardId);
  }

  const [dog, achievementDefinitions, favoriteProducts, recentPurchases] =
    await Promise.all([
      evaluateDogAchievements(id).then(() =>
        prisma.dogProfile.findFirst({
          where: staff ? { id } : { id, ownerUserId: userId },
          include: {
            walletLink: true,
            achievements: { include: { achievement: true } },
            journeyEvents: { orderBy: { occurredAt: "desc" }, take: 5 },
            topUps: { orderBy: { toppedUpAt: "desc" }, take: 5 },
          },
        }),
      ),
      prisma.achievementDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
      getFavoriteProducts(id, 2),
      getRecentPurchaseItems(id, 10),
    ]);

  if (!dog) notFound();

  const totalTopUp = dog.topUps.reduce((s, topUp) => s + Number(topUp.amountEur), 0);
  const photoSrc = dog.photoUrl ? dogPhotoApiSrc(dog.id, dog.updatedAt) : null;
  const unlockedByAchievementId = new Map(
    dog.achievements.map((entry) => [entry.achievementId, entry]),
  );

  const achievementItems = achievementDefinitions
    .filter((def) => def.slug !== "receipt_rookie")
    .map((def) => {
      const unlock = unlockedByAchievementId.get(def.id);
      const labels = getAchievementLabels(t, def.slug, {
        name: def.name,
        description: def.description,
      });

      return {
        id: def.id,
        slug: def.slug,
        name: labels.name,
        description: labels.description,
        icon: def.icon,
        unlocked: Boolean(unlock),
        unlockedAt: unlock?.unlockedAt.toISOString(),
      };
    });

  const infoFields = (
    <>
      {dog.breed && (
        <p>
          <strong>{t("dogs.detail.breed")}</strong> {dog.breed}
        </p>
      )}
      {dog.birthday && (
        <p>
          <strong>{t("dogs.detail.birthday")}</strong>{" "}
          {DateTime.fromJSDate(dog.birthday)
            .setLocale(luxonLocales[locale])
            .toFormat("d MMMM yyyy")}
        </p>
      )}
      {dog.weightKg != null && (
        <p>
          <strong>{t("dogs.detail.weight")}</strong> {dog.weightKg}{" "}
          {t("dogs.detail.weightUnit")}
        </p>
      )}
      {dog.favoriteSnack && (
        <p>
          <strong>{t("dogs.detail.favoriteSnack")}</strong> {dog.favoriteSnack}
        </p>
      )}
      {dog.favoriteIceCream && (
        <p>
          <strong>{t("dogs.detail.favoriteIceCream")}</strong> {dog.favoriteIceCream}
        </p>
      )}
      {dog.personality && (
        <p>
          <strong>{t("dogs.detail.personality")}</strong> {dog.personality}
        </p>
      )}
      <p>
        <strong>{t("dogs.detail.visits")}</strong> {dog.visitCount}
      </p>
      {staff && (
        <p>
          <strong>{t("dogs.detail.totalTopUpAdmin")}</strong> €
          {totalTopUp.toFixed(2)}
        </p>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/"
          className="text-sm text-[var(--foreground-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          {t("dogs.detail.back")}
        </Link>
        <div className="flex items-start gap-4 mt-3">
          <div className="shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--surface-cream)] flex items-center justify-center text-4xl">
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt={dog.name}
                className="w-full h-full object-cover"
              />
            ) : (
              "🐕"
            )}
          </div>
          <div className="flex-1 flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl leading-tight truncate">
                {dog.name}
              </h1>
              <p className="text-[var(--foreground-muted)] font-mono text-sm mt-0.5">
                {dog.woofId}
              </p>
            </div>
            <span className="coin-badge text-lg shrink-0">🪙 {dog.woofCoins}</span>
          </div>
        </div>
      </header>

      <Suspense fallback={<WalletBalanceSkeleton />}>
        <WalletBalanceSection
          dogId={dog.id}
          walletCardId={dog.walletLink?.walletCardId ?? null}
          isOwner={isOwner}
        />
      </Suspense>

      {isOwner ? (
        <Link
          href={`/dogs/${dog.id}/edit`}
          className="card card-link p-5 space-y-2.5 text-sm"
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="font-display text-xl">{t("dogs.detail.infoTitle")}</h2>
            <span className="flex items-center gap-1 text-sm font-semibold text-[var(--accent-primary)] shrink-0">
              {t("dogs.detail.editInfo")}
              <span className="menu-link__chevron" aria-hidden>
                ›
              </span>
            </span>
          </div>
          {infoFields}
        </Link>
      ) : (
        <section className="card p-5 space-y-2.5 text-sm">
          <h2 className="font-display text-xl mb-1">{t("dogs.detail.infoTitle")}</h2>
          {infoFields}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl">{t("dogs.detail.vouchersTitle")}</h2>
          <Link
            href={`/rewards?dog=${dog.id}`}
            className="text-sm font-semibold text-[var(--accent-primary)] hover:underline"
          >
            {t("dogs.detail.rewards")}
          </Link>
        </div>
        <ActiveVouchersList dogProfileId={dog.id} compact />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">{t("dogs.detail.achievementsTitle")}</h2>
        <AchievementsGrid
          items={achievementItems}
          emptyMessage={t("dogs.detail.achievementsEmpty")}
          lockedLabel={t("dogs.detail.achievementLocked")}
        />
      </section>

      <DogProductsSection
        favorites={favoriteProducts.map((product) => ({
          normalizedName: product.normalizedName,
          totalQuantity: product.totalQuantity,
          articleNumber: product.articleNumber,
          category: product.category,
        }))}
        recentPurchases={recentPurchases.map((purchase, index) => ({
          key: `${purchase.normalizedName}-${purchase.purchasedAt.toISOString()}-${index}`,
          normalizedName: purchase.normalizedName,
          quantity: purchase.quantity,
          purchasedAtLabel: DateTime.fromJSDate(purchase.purchasedAt)
            .setLocale(luxonLocales[locale])
            .toFormat("d MMM yyyy, HH:mm"),
          articleNumber: purchase.articleNumber,
          category: purchase.category,
        }))}
      />

      <section className="space-y-3 pt-1">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl">{t("dogs.detail.timelineTitle")}</h2>
          <Link
            href={`/journey/${dog.id}`}
            className="text-sm font-semibold text-[var(--accent-primary)] hover:underline"
          >
            {t("dogs.detail.fullTimeline")}
          </Link>
        </div>
        {dog.journeyEvents.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">
            {t("dogs.detail.timelineEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {dog.journeyEvents.map((ev) => (
              <li key={ev.id} className="card p-3 text-sm">
                <p className="font-semibold">{ev.title}</p>
                <p className="text-[var(--foreground-muted)] text-xs mt-0.5">
                  {DateTime.fromJSDate(ev.occurredAt)
                    .setLocale(luxonLocales[locale])
                    .toFormat("d MMM yyyy, HH:mm")}
                </p>
                {ev.body && (
                  <p className="text-[var(--foreground-muted)] mt-1">{ev.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

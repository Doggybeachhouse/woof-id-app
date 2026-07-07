import Link from "next/link";
import { redirect } from "next/navigation";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { getTranslations } from "@/i18n/server";
import { getSession, isStaffRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const { t } = await getTranslations();
  const session = await getSession();
  if (!session?.user) {
    return (
      <div className="space-y-8">
        <div className="hero-card p-7 sm:p-8 space-y-5">
          <div className="flex flex-col items-center text-center space-y-4">
            <DbhLogo className="h-36 w-36" />
            <p className="eyebrow">{t("home.guest.eyebrow")}</p>
            <h1 className="font-display text-4xl sm:text-5xl leading-tight max-w-md">
              {t("home.guest.headline")}
            </h1>
            <p className="text-[var(--foreground-muted)] max-w-md leading-relaxed">
              {t("home.guest.description")}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/register" className="btn btn-primary">
              {t("home.guest.ctaRegister")}
            </Link>
            <Link href="/login" className="btn btn-secondary">
              {t("home.guest.ctaLogin")}
            </Link>
          </div>
          <p className="text-xs text-[var(--foreground-muted)] text-center pt-1">
            {t("home.guest.checkInHint")}
          </p>
        </div>
        <p className="text-xs text-[var(--foreground-muted)] text-center">
          {t("home.guest.disclaimer")}
        </p>
      </div>
    );
  }

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const dogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { walletLink: true },
  });

  const hasWallet = dogs.some((dog) => dog.walletLink?.walletCardId);

  if (dogs.length === 0) {
    if (isStaffRole(role)) redirect("/admin");
    redirect("/dogs/new");
  }

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <p className="eyebrow">{t("home.loggedIn.eyebrow")}</p>
        <h1 className="font-display text-4xl leading-tight">
          {t("home.loggedIn.headline")}
        </h1>
        <p className="text-[var(--foreground-muted)]">
          {t("home.loggedIn.description")}
        </p>
      </div>

      <div className="grid gap-4">
        {dogs.map((dog) => (
          <Link
            key={dog.id}
            href={`/dogs/${dog.id}`}
            className="card p-5 flex items-center justify-between gap-4 hover:shadow-[var(--shadow-lift)] transition-shadow"
          >
            <div>
              <p className="font-display text-2xl">{dog.name}</p>
              <p className="text-sm text-[var(--foreground-muted)] font-mono">
                {dog.woofId}
              </p>
            </div>
            <span className="coin-badge text-base">🪙 {dog.woofCoins}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dogs" className="btn btn-secondary">
          {t("home.loggedIn.allDogs")}
        </Link>
        <Link href="/check-in" className="btn btn-primary">
          {t("home.loggedIn.checkIn")}
        </Link>
        <Link href="/receipts/scan" className="btn btn-secondary">
          {t("home.loggedIn.scanReceipt")}
        </Link>
        <Link href="/rewards" className="btn btn-secondary">
          {t("home.loggedIn.rewards")}
        </Link>
        {hasWallet && (
          <Link href="/wallet/top-up" className="btn btn-secondary">
            {t("home.loggedIn.topUpWallet")}
          </Link>
        )}
      </div>
    </div>
  );
}

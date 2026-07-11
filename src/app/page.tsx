import Link from "next/link";
import { redirect } from "next/navigation";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { IntroDogCard } from "@/app/_components/IntroDogCard";
import { getTranslations } from "@/i18n/server";
import { getSession, isStaffRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const { t } = await getTranslations();
  const session = await getSession();

  if (session?.user) {
    const userId = (session.user as { id: string }).id;
    const role = (session.user as { role?: string }).role;

    const dogs = await prisma.dogProfile.findMany({
      where: { ownerUserId: userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, woofCoins: true, photoUrl: true, updatedAt: true },
    });

    if (dogs.length === 0) {
      if (isStaffRole(role)) redirect("/admin");
      redirect("/dogs/new");
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2 pt-2">
          <p className="eyebrow">{t("home.loggedIn.eyebrow")}</p>
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">
            {t("home.loggedIn.headline")}
          </h1>
          <p className="text-[var(--foreground-muted)] text-sm">
            {t("home.loggedIn.tapHint")}
          </p>
        </div>

        <div className="intro-dog-grid">
          {dogs.map((dog) => (
            <IntroDogCard key={dog.id} dog={dog} />
          ))}
        </div>

        <div className="text-center pt-2">
          <Link href="/dogs/new" className="btn btn-secondary text-sm">
            {t("dogs.list.addDog")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="hero-card p-7 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <DbhLogo className="h-32 w-32 sm:h-36 sm:w-36" />
          <h1 className="font-display text-4xl sm:text-5xl leading-tight max-w-md">
            {t("home.guest.headline")}
          </h1>
          <p className="text-[var(--foreground-muted)] max-w-md leading-relaxed">
            {t("home.guest.description")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn btn-primary">
            {t("home.guest.ctaRegister")}
          </Link>
          <Link href="/login" className="btn btn-secondary">
            {t("home.guest.ctaLogin")}
          </Link>
        </div>
        <p className="text-xs text-[var(--foreground-muted)] text-center">
          {t("home.guest.checkInHint")}
        </p>
      </div>
      <p className="text-xs text-[var(--foreground-muted)] text-center">
        {t("home.guest.disclaimer")}
      </p>
    </div>
  );
}

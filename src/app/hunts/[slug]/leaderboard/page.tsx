import Link from "next/link";

import { HuntLeaderboard } from "@/app/hunt/_components/HuntLeaderboard";
import { getTranslations } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import { getHuntBySlug, getHuntDisplayName, parseRouteVariant } from "@/lib/scavengerHunt/hunts";
import { requireUser } from "@/lib/serverAuth";

export default async function HuntLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ route?: string }>;
}) {
  const { t, locale } = await getTranslations();
  await requireUser();
  const { slug } = await params;
  const { route } = await searchParams;

  const hunt = getHuntBySlug(slug);
  if (!hunt) {
    return (
      <div className="space-y-4 text-center">
        <p>{t("hunts.notFound")}</p>
        <Link href="/hunts" className="btn btn-primary">
          {t("hunts.backToList")}
        </Link>
      </div>
    );
  }

  const routeVariant = parseRouteVariant(route ?? "full");
  const loc = locale as Locale;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 pt-2">
        <p className="eyebrow">{t("hunt.leaderboard.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight">
          {getHuntDisplayName(slug, loc)}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {routeVariant === "short"
            ? t("hunts.durationShort", { minutes: hunt.durationMinutesShort })
            : t("hunts.durationFull", { minutes: hunt.durationMinutesFull })}
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <Link
          href={`/hunts/${slug}/leaderboard?route=full`}
          className={`btn text-sm${routeVariant === "full" ? " btn-primary" : " btn-secondary"}`}
        >
          {t("hunts.durationFull", { minutes: hunt.durationMinutesFull })}
        </Link>
        <Link
          href={`/hunts/${slug}/leaderboard?route=short`}
          className={`btn text-sm${routeVariant === "short" ? " btn-primary" : " btn-secondary"}`}
        >
          {t("hunts.durationShort", { minutes: hunt.durationMinutesShort })}
        </Link>
      </div>

      <HuntLeaderboard huntSlug={slug} routeVariant={routeVariant} />

      <Link href="/hunts" className="btn btn-secondary w-full text-center">
        {t("hunts.backToList")}
      </Link>
    </div>
  );
}

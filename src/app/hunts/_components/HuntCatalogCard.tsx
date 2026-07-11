"use client";

import Link from "next/link";

import { HuntDifficultyStars } from "@/app/hunt/_components/HuntDifficultyStars";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { HuntCatalogEntry } from "@/lib/scavengerHunt/hunts";

type HuntCatalogCardProps = {
  hunt: HuntCatalogEntry;
  locale: Locale;
};

export function HuntCatalogCard({ hunt, locale }: HuntCatalogCardProps) {
  const { t } = useI18n();
  const loc = locale;

  return (
    <article className="card-luxe p-5 space-y-4">
      <div className="flex items-start gap-3">
        <p className="text-2xl shrink-0" aria-hidden>
          🗺️
        </p>
        <div className="min-w-0 space-y-1">
          <h2 className="font-display text-xl">
            {hunt.name[loc] ?? hunt.name.nl}
          </h2>
          <p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">
            {hunt.areaLabel[loc] ?? hunt.areaLabel.nl}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">
            {hunt.description[loc] ?? hunt.description.nl}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--foreground-muted)]">
        <span className="inline-flex items-center gap-2">
          <HuntDifficultyStars value={hunt.difficultyStars} />
          <span>
            {t("hunts.difficulty", { minutes: hunt.durationMinutesFull })}
          </span>
        </span>
        <span aria-hidden>·</span>
        <span>
          {t("hunts.durationFull", { minutes: hunt.durationMinutesFull })}
        </span>
        <span aria-hidden>·</span>
        <span>
          {t("hunts.durationShort", { minutes: hunt.durationMinutesShort })}
        </span>
      </div>

      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        ⚠️ {t("hunts.wheelchairNotice")}
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/hunt?slug=${encodeURIComponent(hunt.slug)}&route=full`}
          className="btn btn-primary text-sm"
        >
          {t("hunts.startFull", { minutes: hunt.durationMinutesFull })}
        </Link>
        <Link
          href={`/hunt?slug=${encodeURIComponent(hunt.slug)}&route=short`}
          className="btn btn-secondary text-sm"
        >
          {t("hunts.startShort", { minutes: hunt.durationMinutesShort })}
        </Link>
        <Link
          href={`/hunts/${encodeURIComponent(hunt.slug)}/leaderboard`}
          className="btn btn-secondary text-sm"
        >
          {t("hunts.leaderboardLink")}
        </Link>
      </div>
    </article>
  );
}

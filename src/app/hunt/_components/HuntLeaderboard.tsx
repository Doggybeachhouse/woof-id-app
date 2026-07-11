"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";
import { dogPhotoApiSrc } from "@/lib/dogs/photoUrl";
import { formatDuration } from "@/lib/scavengerHunt/leaderboard";
import type { HuntRouteVariant } from "@/lib/scavengerHunt/hunts";

type LeaderboardEntry = {
  rank: number;
  dogId: string;
  dogName: string;
  dogPhotoUrl: string | null;
  dogUpdatedAt: string;
  durationSeconds: number;
};

type HuntLeaderboardProps = {
  huntSlug: string;
  routeVariant: HuntRouteVariant;
  dogId?: string;
  userRank?: number | null;
  userDurationSeconds?: number | null;
  compact?: boolean;
};

export function HuntLeaderboard({
  huntSlug,
  routeVariant,
  dogId,
  userRank,
  userDurationSeconds,
  compact = false,
}: HuntLeaderboardProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      huntSlug,
      routeVariant,
    });
    if (dogId) params.set("dogId", dogId);

    void fetch(`/api/hunt/leaderboard?${params}`)
      .then((res) => res.json())
      .then((data: { entries?: LeaderboardEntry[] }) => {
        setEntries(data.entries ?? []);
      })
      .finally(() => setLoading(false));
  }, [huntSlug, routeVariant, dogId]);

  if (loading) {
    return <p className="hunt-leaderboard__loading">{t("hunt.leaderboard.loading")}</p>;
  }

  if (entries.length === 0) {
    return <p className="hunt-leaderboard__empty">{t("hunt.leaderboard.empty")}</p>;
  }

  return (
    <div className={`hunt-leaderboard${compact ? " hunt-leaderboard--compact" : ""}`}>
      {userRank != null && userDurationSeconds != null && (
        <p className="hunt-leaderboard__you">
          {t("hunt.leaderboard.yourRank", {
            rank: userRank,
            time: formatDuration(userDurationSeconds),
          })}
        </p>
      )}
      <ol className="hunt-leaderboard__list">
        {entries.slice(0, compact ? 5 : 10).map((entry) => (
          <li key={`${entry.dogId}-${entry.rank}`} className="hunt-leaderboard__row">
            <span className="hunt-leaderboard__rank">{entry.rank}</span>
            {entry.dogPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dogPhotoApiSrc(entry.dogId, new Date(entry.dogUpdatedAt))}
                alt=""
                className="hunt-leaderboard__avatar"
              />
            ) : (
              <span className="hunt-leaderboard__avatar hunt-leaderboard__avatar--placeholder" aria-hidden>
                🐕
              </span>
            )}
            <span className="hunt-leaderboard__name">{entry.dogName}</span>
            <span className="hunt-leaderboard__time">
              {formatDuration(entry.durationSeconds)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

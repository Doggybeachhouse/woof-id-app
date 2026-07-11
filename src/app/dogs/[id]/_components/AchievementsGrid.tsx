"use client";

import { useEffect, useState } from "react";

export type AchievementCardItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
};

type AchievementsGridProps = {
  items: AchievementCardItem[];
  emptyMessage: string;
  lockedLabel: string;
};

const NEW_ACHIEVEMENT_MS = 1000 * 60 * 60 * 24;

function isRecentlyUnlocked(unlockedAt?: string) {
  if (!unlockedAt) return false;
  return Date.now() - new Date(unlockedAt).getTime() < NEW_ACHIEVEMENT_MS;
}

export function AchievementsGrid({
  items,
  emptyMessage,
  lockedLabel,
}: AchievementsGridProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const unlockedCount = items.filter((item) => item.unlocked).length;

  if (items.length === 0) {
    return <p className="text-sm text-[var(--foreground-muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
        {unlockedCount}/{items.length}
      </p>
      <div className="achievements-grid">
        {items.map((item, index) => {
          const isNew = item.unlocked && isRecentlyUnlocked(item.unlockedAt);
          const classes = [
            "achievement-card",
            item.unlocked ? "achievement-card--unlocked" : "achievement-card--locked",
            revealed ? "achievement-card--revealed" : "",
            isNew ? "achievement-card--new" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={item.id}
              className={classes}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="achievement-card__icon-wrap">
                <span className="achievement-card__icon" aria-hidden>
                  {item.icon}
                </span>
                {isNew && (
                  <span className="achievement-card__sparkle" aria-hidden>
                    ✨
                  </span>
                )}
              </div>
              <p className="achievement-card__name">{item.name}</p>
              <p className="achievement-card__desc">
                {item.unlocked ? item.description : lockedLabel}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";

import { getTranslations } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import { dogPhotoApiSrc } from "@/lib/dogs/photoUrl";
import { getHuntDisplayName } from "@/lib/scavengerHunt/hunts";
import { formatDuration } from "@/lib/scavengerHunt/leaderboard";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function HuntHistoryPage() {
  const { t, locale } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const loc = locale as Locale;

  const completions = await prisma.scavengerHuntCompletion.findMany({
    where: { dog: { ownerUserId: userId } },
    orderBy: { completedAt: "desc" },
    include: {
      dog: { select: { id: true, name: true, photoUrl: true, updatedAt: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 pt-2">
        <p className="eyebrow">{t("hunts.history.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight">
          {t("hunts.history.title")}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] max-w-md mx-auto">
          {t("hunts.history.subtitle")}
        </p>
      </div>

      {completions.length === 0 ? (
        <div className="card-luxe p-6 text-center space-y-4">
          <p className="text-[var(--foreground-muted)]">{t("hunts.history.empty")}</p>
          <Link href="/hunts" className="btn btn-primary">
            {t("hunts.history.browse")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {completions.map((completion) => {
            const submissions = completion.submissions as {
              checkpointIndex: number;
              imageUrl: string;
            }[];
            const photoCount = submissions.length;

            return (
              <li key={completion.id} className="card-luxe p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {completion.dog.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={dogPhotoApiSrc(
                        completion.dog.id,
                        completion.dog.updatedAt,
                      )}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="w-12 h-12 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-xl"
                      aria-hidden
                    >
                      🐕
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{completion.dog.name}</p>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      {getHuntDisplayName(completion.huntSlug, loc)} ·{" "}
                      {completion.routeVariant === "short"
                        ? t("hunt.route.short.title")
                        : t("hunt.route.full.title")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-lg">
                      {formatDuration(completion.durationSeconds)}
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      {completion.completedAt.toLocaleDateString(loc)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/hunts/completion/${encodeURIComponent(completion.id)}`}
                    className="btn btn-secondary text-sm"
                  >
                    {t("hunts.history.viewCollage")} ({photoCount})
                  </Link>
                  <Link
                    href={`/hunts/${encodeURIComponent(completion.huntSlug)}/leaderboard?route=${completion.routeVariant}`}
                    className="btn btn-secondary text-sm"
                  >
                    {t("hunts.leaderboardLink")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/hunts" className="btn btn-secondary w-full text-center">
        {t("hunts.backToList")}
      </Link>
    </div>
  );
}

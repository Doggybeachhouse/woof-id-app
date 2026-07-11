import Link from "next/link";
import { notFound } from "next/navigation";

import { HuntAdventureCollage } from "@/app/hunt/_components/HuntAdventureCollage";
import { getTranslations } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import { getHuntDisplayName } from "@/lib/scavengerHunt/hunts";
import { formatDuration } from "@/lib/scavengerHunt/leaderboard";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function HuntCompletionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  const loc = locale as Locale;

  const completion = await prisma.scavengerHuntCompletion.findUnique({
    where: { id },
    include: {
      dog: { select: { id: true, name: true, photoUrl: true, updatedAt: true, ownerUserId: true } },
    },
  });

  if (!completion || completion.dog.ownerUserId !== userId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 pt-2">
        <p className="eyebrow">{t("hunts.history.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight">
          {getHuntDisplayName(completion.huntSlug, loc)}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {completion.dog.name} · {formatDuration(completion.durationSeconds)} ·{" "}
          {completion.completedAt.toLocaleDateString(loc)}
        </p>
      </div>

      <HuntAdventureCollage
        dogId={completion.dog.id}
        huntSlug={completion.huntSlug}
        completionId={completion.id}
      />

      <div className="flex flex-wrap gap-2 justify-center">
        <Link href="/hunts/history" className="btn btn-secondary">
          {t("hunts.historyLink")}
        </Link>
        <Link
          href={`/hunts/${encodeURIComponent(completion.huntSlug)}/leaderboard?route=${completion.routeVariant}`}
          className="btn btn-secondary"
        >
          {t("hunts.leaderboardLink")}
        </Link>
      </div>
    </div>
  );
}

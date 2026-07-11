import { prisma } from "@/lib/prisma";
import type { HuntRouteVariant } from "@/lib/scavengerHunt/hunts";

export type LeaderboardEntry = {
  rank: number;
  completionId: string;
  dogId: string;
  dogName: string;
  dogPhotoUrl: string | null;
  dogUpdatedAt: Date;
  durationSeconds: number;
  completedAt: Date;
};

export type LeaderboardResult = {
  entries: LeaderboardEntry[];
  userBest: LeaderboardEntry | null;
  userRank: number | null;
};

function formatEntry(
  row: {
    id: string;
    durationSeconds: number;
    completedAt: Date;
    dog: { id: string; name: string; photoUrl: string | null; updatedAt: Date };
  },
  rank: number,
): LeaderboardEntry {
  return {
    rank,
    completionId: row.id,
    dogId: row.dog.id,
    dogName: row.dog.name,
    dogPhotoUrl: row.dog.photoUrl,
    dogUpdatedAt: row.dog.updatedAt,
    durationSeconds: row.durationSeconds,
    completedAt: row.completedAt,
  };
}

export async function getLeaderboard(
  huntSlug: string,
  routeVariant: HuntRouteVariant,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const rows = await prisma.scavengerHuntCompletion.findMany({
    where: { huntSlug, routeVariant },
    orderBy: [{ durationSeconds: "asc" }, { completedAt: "asc" }],
    take: limit,
    select: {
      id: true,
      durationSeconds: true,
      completedAt: true,
      dog: {
        select: { id: true, name: true, photoUrl: true, updatedAt: true },
      },
    },
  });

  return rows.map((row, index) => formatEntry(row, index + 1));
}

export async function getUserLeaderboardRank(
  huntSlug: string,
  routeVariant: HuntRouteVariant,
  dogProfileId: string,
): Promise<{ entry: LeaderboardEntry | null; rank: number | null }> {
  const best = await prisma.scavengerHuntCompletion.findFirst({
    where: { huntSlug, routeVariant, dogProfileId },
    orderBy: { durationSeconds: "asc" },
    select: {
      id: true,
      durationSeconds: true,
      completedAt: true,
      dog: {
        select: { id: true, name: true, photoUrl: true, updatedAt: true },
      },
    },
  });

  if (!best) {
    return { entry: null, rank: null };
  }

  const fasterCount = await prisma.scavengerHuntCompletion.count({
    where: {
      huntSlug,
      routeVariant,
      OR: [
        { durationSeconds: { lt: best.durationSeconds } },
        {
          durationSeconds: best.durationSeconds,
          completedAt: { lt: best.completedAt },
        },
      ],
    },
  });

  return {
    entry: formatEntry(best, fasterCount + 1),
    rank: fasterCount + 1,
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  getLeaderboard,
  getUserLeaderboardRank,
} from "@/lib/scavengerHunt/leaderboard";
import { parseRouteVariant } from "@/lib/scavengerHunt/hunts";
import { getHuntBySlug } from "@/lib/scavengerHunt/hunts";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const huntSlug = searchParams.get("huntSlug")?.trim();
  const routeVariant = parseRouteVariant(searchParams.get("routeVariant"));
  const dogId = searchParams.get("dogId")?.trim() ?? undefined;

  if (!huntSlug || !getHuntBySlug(huntSlug)) {
    return NextResponse.json({ error: "Unknown hunt" }, { status: 404 });
  }

  const entries = await getLeaderboard(huntSlug, routeVariant);
  let userRank: number | null = null;
  let userBest = null;

  if (dogId) {
    const userResult = await getUserLeaderboardRank(huntSlug, routeVariant, dogId);
    userRank = userResult.rank;
    userBest = userResult.entry;
  }

  return NextResponse.json({
    entries: entries.map((e) => ({
      ...e,
      completedAt: e.completedAt.toISOString(),
      dogUpdatedAt: e.dogUpdatedAt.toISOString(),
    })),
    userRank,
    userBest: userBest
      ? {
          ...userBest,
          completedAt: userBest.completedAt.toISOString(),
          dogUpdatedAt: userBest.dogUpdatedAt.toISOString(),
        }
      : null,
  });
}

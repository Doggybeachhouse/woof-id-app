import { prisma } from "@/lib/prisma";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export type SessionContextInput = {
  sessionId: string;
  dogProfileId: string;
  voucherId?: string | null;
  rewardId?: string | null;
};

export async function upsertMplusSessionContext(input: SessionContextInput) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  return prisma.mplusSessionContext.upsert({
    where: { sessionId: input.sessionId },
    create: {
      sessionId: input.sessionId,
      dogProfileId: input.dogProfileId,
      voucherId: input.voucherId ?? null,
      rewardId: input.rewardId ?? null,
      expiresAt,
    },
    update: {
      dogProfileId: input.dogProfileId,
      voucherId: input.voucherId ?? null,
      rewardId: input.rewardId ?? null,
      expiresAt,
    },
  });
}

export async function getMplusSessionContext(sessionId: string) {
  const context = await prisma.mplusSessionContext.findUnique({
    where: { sessionId },
  });

  if (!context) return null;
  if (context.expiresAt < new Date()) {
    await prisma.mplusSessionContext.delete({ where: { sessionId } }).catch(() => null);
    return null;
  }

  return context;
}

export async function purgeExpiredSessionContexts() {
  await prisma.mplusSessionContext.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

import { createAuthTokenValue } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

const PURPOSE = "hunt-hint-return";
const TOKEN_TTL_MINUTES = 30;

function tokenIdentifier(
  userId: string,
  progressId: string,
  checkpointIndex: number,
  orderId?: number,
) {
  const base = `${PURPOSE}:${userId}:${progressId}:${checkpointIndex}`;
  return orderId && orderId > 0 ? `${base}:${orderId}` : base;
}

function parseIdentifier(identifier: string): {
  userId: string;
  progressId: string;
  checkpointIndex: number;
  orderId?: number;
} | null {
  if (!identifier.startsWith(`${PURPOSE}:`)) {
    return null;
  }

  const parts = identifier.slice(PURPOSE.length + 1).split(":");
  const userId = parts[0]?.trim();
  const progressId = parts[1]?.trim();
  const checkpointIndex = Number(parts[2]);
  if (!userId || !progressId || !Number.isInteger(checkpointIndex) || checkpointIndex < 0) {
    return null;
  }

  const orderId = parts[3] ? Number(parts[3]) : undefined;
  return {
    userId,
    progressId,
    checkpointIndex,
    orderId: orderId && orderId > 0 ? orderId : undefined,
  };
}

export async function createHuntHintReturnToken(
  userId: string,
  progressId: string,
  checkpointIndex: number,
) {
  const token = createAuthTokenValue();
  const expires = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier: { startsWith: `${PURPOSE}:${userId}:${progressId}:` } },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: tokenIdentifier(userId, progressId, checkpointIndex),
      token,
      expires,
    },
  });

  return { token, expires };
}

export async function bindHuntHintReturnTokenOrder(token: string, orderId: number) {
  if (orderId <= 0) {
    return;
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!record || record.expires < new Date()) {
    return;
  }

  const parsed = parseIdentifier(record.identifier);
  if (!parsed) {
    return;
  }

  await prisma.verificationToken.update({
    where: { token },
    data: {
      identifier: tokenIdentifier(
        parsed.userId,
        parsed.progressId,
        parsed.checkpointIndex,
        orderId,
      ),
    },
  });
}

export async function validateHuntHintReturnToken(token: string) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expires < new Date()) {
    return null;
  }

  const parsed = parseIdentifier(record.identifier);
  if (!parsed) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, email: true },
  });
  if (!user?.email) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    progressId: parsed.progressId,
    checkpointIndex: parsed.checkpointIndex,
    orderId: parsed.orderId,
  };
}

export async function consumeHuntHintReturnToken(token: string) {
  const validated = await validateHuntHintReturnToken(token);
  if (!validated) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return null;
  }

  await prisma.verificationToken.delete({ where: { token } });
  return validated;
}

export function buildHuntHintSuccessReturnUrl(token: string, dogId: string): string {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXTAUTH_URL ontbreekt in serverconfiguratie.");
  }

  const url = new URL("/hunt", base);
  url.searchParams.set("dogId", dogId);
  url.searchParams.set("hintReturn", token);
  return url.toString();
}

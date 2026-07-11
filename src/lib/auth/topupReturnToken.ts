import { createAuthTokenValue } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

const PURPOSE = "topup-return";
const TOKEN_TTL_MINUTES = 30;

function tokenIdentifier(userId: string, orderId?: number) {
  const base = `${PURPOSE}:${userId}`;
  return orderId && orderId > 0 ? `${base}:${orderId}` : base;
}

function parseIdentifier(identifier: string): { userId: string; orderId?: number } | null {
  if (!identifier.startsWith(`${PURPOSE}:`)) {
    return null;
  }

  const parts = identifier.slice(PURPOSE.length + 1).split(":");
  const userId = parts[0]?.trim();
  if (!userId) {
    return null;
  }

  const orderId = parts[1] ? Number(parts[1]) : undefined;
  return {
    userId,
    orderId: orderId && orderId > 0 ? orderId : undefined,
  };
}

export async function createTopUpReturnToken(userId: string) {
  const token = createAuthTokenValue();
  const expires = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier: { startsWith: `${PURPOSE}:${userId}` } },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: tokenIdentifier(userId),
      token,
      expires,
    },
  });

  return { token, expires };
}

export async function bindTopUpReturnTokenOrder(token: string, orderId: number) {
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
    data: { identifier: tokenIdentifier(parsed.userId, orderId) },
  });
}

export async function validateTopUpReturnToken(token: string) {
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
    orderId: parsed.orderId,
  };
}

export async function consumeTopUpReturnToken(token: string) {
  const validated = await validateTopUpReturnToken(token);
  if (!validated) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return null;
  }

  await prisma.verificationToken.delete({ where: { token } });
  return validated;
}

export function buildTopUpSuccessReturnUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXTAUTH_URL ontbreekt in serverconfiguratie.");
  }

  const url = new URL("/wallet/top-up/success", base);
  url.searchParams.set("token", token);
  return url.toString();
}

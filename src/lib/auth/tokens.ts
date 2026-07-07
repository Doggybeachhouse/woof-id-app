import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

export type AuthTokenPurpose = "reset" | "magic";

const TOKEN_TTL_HOURS = 1;

function tokenIdentifier(purpose: AuthTokenPurpose, email: string) {
  return `${purpose}:${email.trim().toLowerCase()}`;
}

export function createAuthTokenValue() {
  return randomBytes(32).toString("hex");
}

export async function createAuthToken(
  email: string,
  purpose: AuthTokenPurpose,
) {
  const normalized = email.trim().toLowerCase();
  const token = createAuthTokenValue();
  const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier: tokenIdentifier(purpose, normalized) },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: tokenIdentifier(purpose, normalized),
      token,
      expires,
    },
  });

  return { token, expires, email: normalized };
}

export async function validateAuthToken(
  token: string,
  purpose: AuthTokenPurpose,
) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expires < new Date()) {
    return null;
  }

  if (!record.identifier.startsWith(`${purpose}:`)) {
    return null;
  }

  return { email: record.identifier.slice(purpose.length + 1) };
}

export async function consumeAuthToken(
  token: string,
  purpose: AuthTokenPurpose,
) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expires < new Date()) {
    if (record) {
      await prisma.verificationToken.delete({ where: { token } });
    }
    return null;
  }

  if (!record.identifier.startsWith(`${purpose}:`)) {
    return null;
  }

  const email = record.identifier.slice(purpose.length + 1);

  await prisma.verificationToken.delete({ where: { token } });

  return { email };
}

export function buildAuthUrl(
  baseUrl: string,
  path: string,
  token: string,
) {
  const url = new URL(path, baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

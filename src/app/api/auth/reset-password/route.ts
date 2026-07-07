import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { consumeAuthToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const consumed = await consumeAuthToken(parsed.data.token, "reset");
  if (!consumed) {
    return NextResponse.json(
      { error: "Link is ongeldig of verlopen" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { email: consumed.email },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  const valid =
    Boolean(record) &&
    record!.identifier.startsWith("reset:") &&
    record!.expires >= new Date();

  return NextResponse.json({ valid });
}

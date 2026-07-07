import { NextResponse } from "next/server";
import { z } from "zod";

import { bridgeUnauthorized, verifyBridgeSecret } from "@/lib/bridge/auth";
import {
  createBridgeUser,
  findUserByEmail,
  verifyUserPassword,
} from "@/lib/bridge/users";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  if (!verifyBridgeSecret(req)) return bridgeUnauthorized();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);

  if (existing) {
    const valid = await verifyUserPassword(email, parsed.data.password);
    if (!valid) {
      return NextResponse.json(
        {
          error: "email_exists",
          message: "Email already registered on Woof ID with a different password.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, linked: true });
  }

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "ADMIN" : "OWNER";

  try {
    await createBridgeUser({
      email,
      password: parsed.data.password,
      name: parsed.data.name,
      role,
    });
  } catch {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true }, { status: 201 });
}

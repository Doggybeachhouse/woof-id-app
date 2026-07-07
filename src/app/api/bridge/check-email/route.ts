import { NextResponse } from "next/server";
import { z } from "zod";

import { bridgeUnauthorized, verifyBridgeSecret } from "@/lib/bridge/auth";
import { findUserByEmail } from "@/lib/bridge/users";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  if (!verifyBridgeSecret(req)) return bridgeUnauthorized();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await findUserByEmail(email);

  return NextResponse.json({ exists: Boolean(user) });
}

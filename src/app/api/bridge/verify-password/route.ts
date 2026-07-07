import { NextResponse } from "next/server";
import { z } from "zod";

import { bridgeUnauthorized, verifyBridgeSecret } from "@/lib/bridge/auth";
import { verifyUserPassword } from "@/lib/bridge/users";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  if (!verifyBridgeSecret(req)) return bridgeUnauthorized();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const valid = await verifyUserPassword(
    parsed.data.email,
    parsed.data.password,
  );

  return NextResponse.json({ valid });
}

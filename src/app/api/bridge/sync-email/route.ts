import { NextResponse } from "next/server";
import { z } from "zod";

import { bridgeUnauthorized, verifyBridgeSecret } from "@/lib/bridge/auth";
import {
  findUserByEmail,
  updateBridgeEmail,
  verifyUserPassword,
} from "@/lib/bridge/users";

const bodySchema = z.object({
  old_email: z.string().email(),
  new_email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  if (!verifyBridgeSecret(req)) return bridgeUnauthorized();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const oldEmail = parsed.data.old_email.trim().toLowerCase();
  const newEmail = parsed.data.new_email.trim().toLowerCase();

  const user = await findUserByEmail(oldEmail);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const valid = await verifyUserPassword(oldEmail, parsed.data.password);
  if (!valid) {
    return NextResponse.json({ error: "password_mismatch" }, { status: 403 });
  }

  const taken = await findUserByEmail(newEmail);
  if (taken && taken.id !== user.id) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  await updateBridgeEmail(oldEmail, newEmail);

  return NextResponse.json({ ok: true });
}

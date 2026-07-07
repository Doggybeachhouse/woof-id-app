import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { findUserByEmail } from "@/lib/bridge/users";
import { getTranslations } from "@/i18n/server";
import { registerWebshopAccount } from "@/lib/wordpress/accounts";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  const { t } = await getTranslations();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("errors.registerApi.invalidInput") },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      {
        error: t("errors.registerApi.emailInUseWoofId"),
        code: "email_in_use_woof_id",
      },
      { status: 409 },
    );
  }

  const webshop = await registerWebshopAccount({
    email,
    password: parsed.data.password,
    name: parsed.data.name,
  });
  if (!webshop.ok) {
    return NextResponse.json(
      {
        error: webshop.error,
        code:
          webshop.code === "email_exists"
            ? "email_in_use_webshop"
            : webshop.code ?? "webshop_error",
      },
      { status: 400 },
    );
  }

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "ADMIN" : "OWNER";
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: parsed.data.name,
        role,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: t("errors.registerApi.createFailed"),
        code: "create_failed",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, role, linked: webshop.linked });
}

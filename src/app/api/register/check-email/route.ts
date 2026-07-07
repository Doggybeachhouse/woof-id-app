import { NextResponse } from "next/server";
import { z } from "zod";

import { findUserByEmail } from "@/lib/bridge/users";
import { getTranslations } from "@/i18n/server";
import { checkWebshopEmail } from "@/lib/wordpress/accounts";

const bodySchema = z.object({
  email: z.string().email(),
});

export type EmailAvailabilityCode =
  | "available"
  | "email_in_use_woof_id"
  | "email_in_use_webshop";

export async function POST(req: Request) {
  const { t } = await getTranslations();
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("errors.registerApi.invalidEmail") },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const woofIdUser = await findUserByEmail(email);
  if (woofIdUser) {
    return NextResponse.json({
      available: false,
      code: "email_in_use_woof_id" satisfies EmailAvailabilityCode,
      message: t("errors.registerApi.emailInUseWoofId"),
    });
  }

  const webshop = await checkWebshopEmail(email);
  if (webshop.exists) {
    return NextResponse.json({
      available: false,
      code: "email_in_use_webshop" satisfies EmailAvailabilityCode,
      message: t("errors.registerApi.emailInUseWebshop"),
      canLink: true,
    });
  }

  return NextResponse.json({
    available: true,
    code: "available" satisfies EmailAvailabilityCode,
    message: t("errors.registerApi.emailAvailable"),
  });
}

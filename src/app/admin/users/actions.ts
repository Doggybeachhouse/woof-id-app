"use server";

import { sendRecoveryEmail } from "@/lib/auth/recoveryEmail";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/serverAuth";

export type RecoveryEmailErrorCode =
  | "invalidEmail"
  | "userNotFound"
  | "smtpNotConfigured"
  | "emailSendFailed";

export async function sendRecoveryEmailAction(formData: FormData) {
  await requireStaff();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const mode = String(formData.get("mode") ?? "reset") as "reset" | "magic";

  if (!email.includes("@")) {
    return { errorCode: "invalidEmail" as const };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { errorCode: "userNotFound" as const };
  }

  const result = await sendRecoveryEmail(email, mode);

  if (!result.sent) {
    if (result.reason === "smtp_not_configured") {
      return { errorCode: "smtpNotConfigured" as const };
    }
    return { errorCode: "emailSendFailed" as const };
  }

  return {
    success: true,
    email,
    mode,
  };
}

import {
  AuthTokenPurpose,
  buildAuthUrl,
  createAuthToken,
} from "@/lib/auth/tokens";
import { isEmailConfigured, sendEmail } from "@/lib/email/sendEmail";

export function getRecoveryEmailContent(mode: AuthTokenPurpose, link: string) {
  const subject =
    mode === "magic"
      ? "Je inloglink voor Woof ID"
      : "Reset je Woof ID wachtwoord";
  const text =
    mode === "magic"
      ? `Log in via deze link (1 uur geldig): ${link}`
      : `Stel een nieuw wachtwoord in via deze link (1 uur geldig): ${link}`;

  return {
    subject,
    text,
    html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
  };
}

export async function createRecoveryLink(
  email: string,
  mode: AuthTokenPurpose,
) {
  const { token } = await createAuthToken(email, mode);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const path = mode === "magic" ? "/login/magic" : "/reset-password";
  return buildAuthUrl(baseUrl, path, token);
}

export async function sendRecoveryEmail(
  email: string,
  mode: AuthTokenPurpose,
) {
  const link = await createRecoveryLink(email, mode);

  if (!isEmailConfigured()) {
    return { sent: false as const, reason: "smtp_not_configured" as const, link };
  }

  const content = getRecoveryEmailContent(mode, link);
  const result = await sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (!result.sent) {
    return { sent: false as const, reason: result.reason, link };
  }

  return { sent: true as const };
}

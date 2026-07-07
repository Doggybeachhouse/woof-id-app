type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getSmtpConfig() {
  const user = process.env.SMTP_USER ?? process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS ?? process.env.GMAIL_APP_PASSWORD;
  const host = process.env.SMTP_HOST ?? (user ? "smtp.gmail.com" : undefined);
  const from =
    process.env.EMAIL_FROM ??
    (user ? `Woof ID <${user}>` : undefined);

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from,
  };
}

export function isEmailConfigured() {
  return getSmtpConfig() !== null;
}

export async function sendEmail(input: SendEmailInput) {
  const config = getSmtpConfig();
  if (!config) {
    return { sent: false as const, reason: "smtp_not_configured" as const };
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transport.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return { sent: true as const };
}

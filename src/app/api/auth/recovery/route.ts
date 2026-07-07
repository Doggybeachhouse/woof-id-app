import { NextResponse } from "next/server";
import { z } from "zod";

import { sendRecoveryEmail } from "@/lib/auth/recoveryEmail";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  mode: z.enum(["reset", "magic"]).default("reset"),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({
      ok: true,
      message:
        "Als dit e-mailadres bij ons bekend is, ontvang je instructies.",
    });
  }

  const result = await sendRecoveryEmail(email, parsed.data.mode);

  if (result.sent) {
    return NextResponse.json({
      ok: true,
      sent: true,
      message: "Controleer je e-mail voor de volgende stap.",
    });
  }

  return NextResponse.json({
    ok: true,
    sent: false,
    message:
      "E-mail is nog niet ingesteld. Vraag een medewerker om hulp in de winkel.",
    staffLink: "link" in result ? result.link : undefined,
  });
}

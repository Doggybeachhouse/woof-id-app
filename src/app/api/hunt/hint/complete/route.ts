import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import {
  consumeHuntHintReturnToken,
  validateHuntHintReturnToken,
} from "@/lib/auth/huntHintReturnToken";
import { isLocale, localeCookie, type Locale } from "@/i18n/config";
import { fulfillPaidHuntHint } from "@/lib/scavengerHunt/hints";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  token: z.string().min(10),
  locale: z.string().optional(),
  consume: z.boolean().optional(),
});

async function resolveRequestLocale(localeParam: string | undefined): Promise<Locale> {
  if (localeParam && isLocale(localeParam)) {
    return localeParam;
  }
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookie)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }
  return "nl";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email?.trim().toLowerCase();

  if (!userId || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const validated = parsed.data.consume
    ? await consumeHuntHintReturnToken(parsed.data.token)
    : await validateHuntHintReturnToken(parsed.data.token);

  if (!validated || validated.userId !== userId) {
    return NextResponse.json(
      { error: "Deze terugkeerlink is ongeldig of verlopen." },
      { status: 400 },
    );
  }

  if (!validated.orderId) {
    return NextResponse.json({ error: "missing_order", pending: true }, { status: 402 });
  }

  const progress = await prisma.scavengerHuntProgress.findUnique({
    where: { id: validated.progressId },
    select: { huntSlug: true },
  });
  if (!progress) {
    return NextResponse.json({ error: "Progress not found" }, { status: 404 });
  }

  const locale = await resolveRequestLocale(parsed.data.locale);
  const result = await fulfillPaidHuntHint({
    progressId: validated.progressId,
    checkpointIndex: validated.checkpointIndex,
    orderId: validated.orderId,
    email,
    locale,
    huntSlug: progress.huntSlug,
    userId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, pending: result.pending ?? false },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    hintText: result.hintText,
    checkpointIndex: validated.checkpointIndex,
    alreadyFulfilled: result.alreadyFulfilled,
  });
}

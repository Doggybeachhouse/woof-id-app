import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { isLocale, localeCookie, type Locale } from "@/i18n/config";
import { fulfillPaidHuntHintByOrder } from "@/lib/scavengerHunt/hints";

const bodySchema = z.object({
  dogId: z.string().min(1),
  huntSlug: z.string().min(1),
  checkpointIndex: z.coerce.number().int().min(0),
  orderId: z.coerce.number().int().positive(),
  locale: z.string().optional(),
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

  const locale = await resolveRequestLocale(parsed.data.locale);
  const result = await fulfillPaidHuntHintByOrder({
    ...parsed.data,
    email,
    locale,
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
    alreadyFulfilled: result.alreadyFulfilled,
  });
}

import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { isLocale, localeCookie, type Locale } from "@/i18n/config";
import { getHuntHintStatus, revealFreeHuntHint } from "@/lib/scavengerHunt/hints";

const querySchema = z.object({
  dogId: z.string().min(1),
  huntSlug: z.string().min(1),
  checkpointIndex: z.coerce.number().int().min(0),
});

const bodySchema = querySchema.extend({
  locale: z.string().optional(),
});

async function resolveRequestLocale(
  localeParam: string | undefined,
): Promise<Locale> {
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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    dogId: searchParams.get("dogId"),
    huntSlug: searchParams.get("huntSlug"),
    checkpointIndex: searchParams.get("checkpointIndex"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const locale = await resolveRequestLocale(searchParams.get("locale") ?? undefined);
  const result = await getHuntHintStatus({
    ...parsed.data,
    locale,
    userId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const locale = await resolveRequestLocale(parsed.data.locale);
  const result = await revealFreeHuntHint({
    dogId: parsed.data.dogId,
    huntSlug: parsed.data.huntSlug,
    checkpointIndex: parsed.data.checkpointIndex,
    locale,
    userId,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        needsPurchase: result.needsPurchase ?? false,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    hintText: result.hintText,
    source: result.source,
  });
}

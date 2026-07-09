import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push/server";

const bodySchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const result = await sendPushToAll(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "vapid_not_configured") {
      return NextResponse.json({ error: "vapid_not_configured" }, { status: 503 });
    }

    return NextResponse.json({ error: "sendFailed" }, { status: 500 });
  }
}

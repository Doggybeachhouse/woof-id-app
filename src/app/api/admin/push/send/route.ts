import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPushAdminSecret } from "@/lib/push/adminAuth";
import {
  sendPushToAll,
  sendPushToEmails,
  sendPushToUserIds,
  type PushPayload,
} from "@/lib/push/send";

const bodySchema = z
  .object({
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(500),
    url: z.string().url().optional(),
    all: z.boolean().optional(),
    userIds: z.array(z.string().min(1)).optional(),
    emails: z.array(z.string().email()).optional(),
  })
  .superRefine((data, ctx) => {
    const modes = [data.all === true, (data.userIds?.length ?? 0) > 0, (data.emails?.length ?? 0) > 0].filter(
      Boolean,
    ).length;

    if (modes !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Specify exactly one audience: all, userIds, or emails.",
        path: ["all"],
      });
    }
  });

export async function POST(req: Request) {
  if (!verifyPushAdminSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload: PushPayload = {
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
  };

  try {
    if (parsed.data.all) {
      const result = await sendPushToAll(payload);
      return NextResponse.json({ ok: true, audience: "all", ...result });
    }

    if (parsed.data.userIds?.length) {
      const result = await sendPushToUserIds(parsed.data.userIds, payload);
      return NextResponse.json({ ok: true, audience: "userIds", ...result });
    }

    const result = await sendPushToEmails(parsed.data.emails ?? [], payload);
    return NextResponse.json({ ok: true, audience: "emails", ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "vapid_not_configured") {
      return NextResponse.json({ error: "vapid_not_configured" }, { status: 503 });
    }

    return NextResponse.json({ error: "sendFailed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { mplusJsonResponse } from "@/lib/mplus/webhook/respond";
import {
  getMplusWebhookSecret,
  verifyMplusSignature,
} from "@/lib/mplus/webhook/signature";
import { unwrapMplusPayload } from "@/lib/mplus/webhook/types";
import type { MplusCompleteSessionPayload } from "@/lib/mplus/webhook/types";

export async function handleMplusWebhook<T extends Record<string, unknown>>(
  req: Request,
  process: (payload: MplusCompleteSessionPayload) => Promise<T>,
  eventName: string,
) {
  const secret = getMplusWebhookSecret();
  if (!secret) {
    console.error(`[mplus/webhook] ${eventName}: MPLUS_WEBHOOK_SECRET is not configured`);
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Webhook secret missing." } },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Mplus-Signature");

  if (!verifyMplusSignature(rawBody, signature, secret)) {
    return mplusJsonResponse(
      {
        error: {
          code: "INVALID_SIGNATURE",
          message: "Invalid signature.",
        },
      },
      400,
      secret,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return mplusJsonResponse(
      {
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON.",
        },
      },
      400,
      secret,
    );
  }

  const payload = unwrapMplusPayload(parsed);
  if (!payload) {
    return mplusJsonResponse(
      {
        error: {
          code: "INVALID_DATA",
          message: "Invalid webhook payload.",
        },
      },
      400,
      secret,
    );
  }

  try {
    const result = await process(payload);
    return mplusJsonResponse(result, 200, secret);
  } catch (error) {
    console.error(`[mplus/webhook] ${eventName} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return mplusJsonResponse(
      {
        error: {
          code: "PROCESSING_FAILED",
          message: `Could not process ${eventName} webhook.`,
        },
      },
      400,
      secret,
    );
  }
}

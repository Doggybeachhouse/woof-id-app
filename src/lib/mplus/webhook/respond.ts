import { NextResponse } from "next/server";

import { signMplusPayload } from "@/lib/mplus/webhook/signature";

export function mplusJsonResponse(
  body: Record<string, unknown>,
  status: number,
  secret: string,
) {
  const payload = JSON.stringify(body);
  return new NextResponse(payload, {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Mplus-Signature": signMplusPayload(payload, secret),
    },
  });
}

import { NextResponse } from "next/server";

import { handleCompleteSessionWebhook } from "@/lib/mplus/webhook/completeSessionHandler";

export async function POST(req: Request) {
  return handleCompleteSessionWebhook(req);
}

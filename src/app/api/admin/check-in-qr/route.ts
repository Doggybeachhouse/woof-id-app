import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { buildCheckInQrPayload } from "@/lib/checkin/qrPayload";

function resolveBaseUrl(req: Request) {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const host = req.headers.get("host");
  if (!host) return "http://localhost:3000";

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const baseUrl = resolveBaseUrl(req);
  const loc = "zandvoort";
  const payload = await buildCheckInQrPayload(baseUrl, loc);

  return NextResponse.json({
    ...payload,
    loc,
  });
}

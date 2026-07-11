import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { fetchHuntHintPaymentStatus } from "@/lib/wordpress/huntHint";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = Number(searchParams.get("orderId") ?? 0);
  if (orderId <= 0) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  const status = await fetchHuntHintPaymentStatus({ email, orderId });
  if (!status) {
    return NextResponse.json({ error: "status_unavailable" }, { status: 502 });
  }

  return NextResponse.json({ paid: status.paid, amountEur: status.amountEur });
}

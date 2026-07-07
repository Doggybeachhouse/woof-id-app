import { headers } from "next/headers";

import { CheckInQrDisplay } from "@/app/admin/check-in-display/_components/CheckInQrDisplay";
import { buildCheckInQrPayload } from "@/lib/checkin/qrPayload";
import { requireStaff } from "@/lib/serverAuth";

function resolveBaseUrl(headerStore: Headers) {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const host = headerStore.get("host");
  if (!host) return "http://localhost:3000";

  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function CheckInDisplayPage() {
  await requireStaff();
  const headerStore = await headers();
  const initialQr = await buildCheckInQrPayload(resolveBaseUrl(headerStore));

  return <CheckInQrDisplay initialQr={initialQr} />;
}

import QRCode from "qrcode";

import {
  buildRotatingCheckInQrUrl,
  secondsUntilCheckInQrExpiry,
} from "@/lib/checkin/rotatingToken";

export type CheckInQrPayload = {
  url: string;
  qrDataUrl: string;
  secondsRemaining: number;
};

export async function buildCheckInQrPayload(baseUrl: string, loc = "zandvoort") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const url = buildRotatingCheckInQrUrl(normalizedBase, loc);
  const secondsRemaining = secondsUntilCheckInQrExpiry();
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 520,
    margin: 2,
    color: { dark: "#2c2824", light: "#ffffff" },
  });

  return { url, qrDataUrl, secondsRemaining };
}

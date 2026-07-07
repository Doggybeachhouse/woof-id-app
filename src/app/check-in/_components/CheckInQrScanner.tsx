"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { BarcodeScanner } from "@/app/receipts/_components/BarcodeScanner";
import { useI18n } from "@/i18n/client";
import { parseCheckInScan } from "@/lib/checkin/qrGate";

export function CheckInQrScanner({
  invalidReason,
}: {
  invalidReason?: "expired";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [scanKey, setScanKey] = useState(0);

  const onQrDetected = useCallback(
    (raw: string) => {
      const parsed = parseCheckInScan(raw);
      if (!parsed) {
        setError(t("errors.checkIn.invalidQr"));
        return;
      }
      setError("");
      const qs = new URLSearchParams({ loc: parsed.loc, token: parsed.token });
      router.push(`/check-in?${qs.toString()}`);
    },
    [router, t],
  );

  const retry = useCallback(() => {
    setError("");
    setScanKey((key) => key + 1);
  }, []);

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center space-y-2">
        <p className="text-4xl">🏖️</p>
        <h1 className="font-display text-3xl">{t("checkIn.scanner.title")}</h1>
        <p className="text-[var(--foreground-muted)] text-sm">
          {t("checkIn.scanner.instructionsPrefix")}{" "}
          <strong>{t("checkIn.scanner.instructionsBold")}</strong>{" "}
          {t("checkIn.scanner.instructionsSuffix")}
        </p>
        {invalidReason === "expired" && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t("checkIn.scanner.expiredQr")}
          </p>
        )}
      </div>

      <div className="relative mx-auto max-w-md">
        <BarcodeScanner
          key={scanKey}
          autoStart
          hideControls
          scanMode="qr"
          onDetected={onQrDetected}
          disabled={false}
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
          <div className="w-56 h-56 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      </div>

      {error && (
        <div className="card p-4 space-y-3 text-sm">
          <p className="text-amber-900">{error}</p>
          <button type="button" className="btn btn-primary w-full" onClick={retry}>
            {t("checkIn.scanner.retry")}
          </button>
        </div>
      )}

      <p className="text-xs text-center text-[var(--foreground-muted)]">
        {t("checkIn.scanner.footerHint")}
      </p>
    </div>
  );
}

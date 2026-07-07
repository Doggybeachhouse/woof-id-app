"use client";

import { useCallback, useEffect, useState } from "react";

import { BarcodeScanner } from "@/app/receipts/_components/BarcodeScanner";
import { DbhLogo } from "@/app/_components/DbhLogo";
import { LanguageSwitcher } from "@/app/_components/LanguageSwitcher";
import { useI18n } from "@/i18n/client";
import type { CheckInQrPayload } from "@/lib/checkin/qrPayload";

type QrPayload = CheckInQrPayload;

type VoucherPhase =
  | "idle"
  | "scanning"
  | "processing"
  | "success"
  | "already_redeemed"
  | "error";

const SUCCESS_RETURN_MS = 2800;
const QR_FETCH_TIMEOUT_MS = 12_000;

function GreenCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="48" cy="48" r="48" fill="currentColor" />
      <path
        d="M28 50.5L42 64.5L68 34.5"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

async function fetchCheckInQr(): Promise<QrPayload> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), QR_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("/api/admin/check-in-qr", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const data = (await res.json()) as QrPayload & { error?: string };

    if (!res.ok) {
      throw new Error(data.error ?? "qr_load_failed");
    }
    if (!data.qrDataUrl) {
      throw new Error("qr_load_failed");
    }

    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function CheckInQrDisplay({ initialQr }: { initialQr?: QrPayload }) {
  const { t } = useI18n();
  const [qrDataUrl, setQrDataUrl] = useState(initialQr?.qrDataUrl ?? "");
  const [secondsRemaining, setSecondsRemaining] = useState(initialQr?.secondsRemaining ?? 0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initialQr?.qrDataUrl);

  const [voucherPhase, setVoucherPhase] = useState<VoucherPhase>("idle");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherDetail, setVoucherDetail] = useState("");

  const loadQr = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError("");

    try {
      const data = await fetchCheckInQr();
      setQrDataUrl(data.qrDataUrl);
      setSecondsRemaining(data.secondsRemaining);
    } catch (err) {
      const message =
        err instanceof Error && err.message === "forbidden"
          ? t("errors.login.staffRequired")
          : err instanceof DOMException && err.name === "AbortError"
            ? t("checkIn.display.loadTimeout")
            : t("errors.admin.qrLoadFailed");
      setError(message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (!initialQr?.qrDataUrl) {
      void loadQr(true);
    }

    const refresh = window.setInterval(() => {
      void loadQr(false);
    }, 30_000);
    return () => window.clearInterval(refresh);
  }, [initialQr?.qrDataUrl, loadQr]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const tick = window.setInterval(() => {
      setSecondsRemaining((s) => {
        if (s <= 1) {
          void loadQr(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [secondsRemaining, loadQr]);

  const resetVoucher = useCallback(() => {
    setVoucherPhase("idle");
    setVoucherMessage("");
    setVoucherDetail("");
  }, []);

  useEffect(() => {
    if (voucherPhase !== "success" && voucherPhase !== "already_redeemed") {
      return;
    }
    const timer = window.setTimeout(resetVoucher, SUCCESS_RETURN_MS);
    return () => window.clearTimeout(timer);
  }, [voucherPhase, resetVoucher]);

  async function handleVoucherDetected(rawCode: string) {
    setVoucherPhase("processing");

    try {
      const res = await fetch("/api/admin/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: rawCode }),
      });
      const data = await res.json();

      if (data.ok && data.voucher) {
        setVoucherDetail(
          t("checkIn.display.voucherSuccessDetail", {
            rewardTitle: data.voucher.rewardTitle,
            dogName: data.voucher.dogName,
          }),
        );
        setVoucherPhase("success");
        return;
      }

      if (data.errorCode === "already_redeemed" && data.voucher) {
        setVoucherMessage(t("checkIn.display.voucherAlreadyRedeemedTitle"));
        setVoucherDetail(
          t("checkIn.display.voucherAlreadyRedeemedBody", {
            rewardTitle: data.voucher.rewardTitle,
            dogName: data.voucher.dogName,
          }),
        );
        setVoucherPhase("already_redeemed");
        return;
      }

      setVoucherMessage(t("checkIn.display.voucherErrorTitle"));
      setVoucherDetail(
        data.errorCode === "cancelled"
          ? t("checkIn.display.voucherErrorCancelled")
          : t("checkIn.display.voucherErrorNotFound"),
      );
      setVoucherPhase("error");
    } catch {
      setVoucherMessage(t("checkIn.display.voucherErrorTitle"));
      setVoucherDetail(t("errors.admin.connectionFailed"));
      setVoucherPhase("error");
    }
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const showQr = voucherPhase === "idle";

  return (
    <div className="checkin-display fixed inset-0 z-[200] overflow-auto">
      <div className="fixed top-0 right-0 z-[220] p-4 sm:p-5 pointer-events-none">
        <LanguageSwitcher size="large" />
      </div>

      {(voucherPhase === "success" || voucherPhase === "already_redeemed") && (
        <div
          className={`fixed inset-0 z-[210] flex flex-col items-center justify-center px-8 text-center ${
            voucherPhase === "success"
              ? "bg-green-600"
              : "bg-amber-500"
          }`}
        >
          {voucherPhase === "success" ? (
            <>
              <GreenCheckIcon className="voucher-check-pop h-36 w-36 sm:h-44 sm:w-44 text-green-700 drop-shadow-lg" />
              <p className="mt-6 font-display text-3xl sm:text-4xl text-white">
                {t("checkIn.display.voucherSuccessTitle")}
              </p>
              {voucherDetail ? (
                <p className="mt-3 text-lg text-white/90 max-w-md">{voucherDetail}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-7xl sm:text-8xl" aria-hidden>
                ⚠️
              </p>
              <p className="mt-4 font-display text-3xl sm:text-4xl text-white">
                {voucherMessage}
              </p>
              {voucherDetail ? (
                <p className="mt-3 text-lg text-white/90 max-w-md">{voucherDetail}</p>
              ) : null}
            </>
          )}
        </div>
      )}

      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 text-center space-y-8">
        <div className="space-y-3">
          <DbhLogo className="mx-auto h-24 w-24" href={null} />
          <h1 className="font-display text-4xl sm:text-5xl text-[var(--accent-pink)]">
            {t("checkIn.display.title")}
          </h1>
          <p className="text-[var(--foreground-muted)] max-w-md mx-auto">
            {t("checkIn.display.instructions")}
          </p>
        </div>

        {showQr && (
          <div className="card-luxe p-6 sm:p-8 inline-flex flex-col items-center gap-4">
            {loading && !qrDataUrl ? (
              <p className="text-sm text-[var(--foreground-muted)]">
                {t("checkIn.display.loading")}
              </p>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={t("checkIn.display.qrAlt")}
                width={520}
                height={520}
                className="w-[min(72vw,420px)] h-auto rounded-2xl"
              />
            ) : null}

            {error ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600">{error}</p>
                <button type="button" className="btn btn-secondary" onClick={() => void loadQr(true)}>
                  {t("checkIn.display.retryLoad")}
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-[var(--foreground-muted)]">
                {t("checkIn.display.refreshCountdown", {
                  minutes,
                  seconds: seconds.toString().padStart(2, "0"),
                })}
              </p>
            )}
          </div>
        )}

        {voucherPhase === "scanning" && (
          <div className="w-full max-w-md space-y-4">
            <BarcodeScanner
              autoStart
              hideControls
              onDetected={(code) => void handleVoucherDetected(code)}
              disabled={false}
            />
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={resetVoucher}
            >
              {t("checkIn.display.cancelVoucherScan")}
            </button>
          </div>
        )}

        {voucherPhase === "processing" && (
          <div className="card-luxe p-8 w-full max-w-md">
            <p className="text-lg font-semibold">{t("common.busy")}</p>
          </div>
        )}

        {voucherPhase === "error" && (
          <div className="card-luxe p-8 w-full max-w-md space-y-3 border-red-200 bg-red-50">
            <h2 className="font-display text-2xl text-red-800">{voucherMessage}</h2>
            <p className="text-red-700">{voucherDetail}</p>
            <button type="button" className="btn btn-secondary w-full" onClick={resetVoucher}>
              {t("checkIn.display.voucherTryAgain")}
            </button>
          </div>
        )}

        {voucherPhase === "idle" && (
          <button
            type="button"
            className="btn btn-primary text-lg px-10 py-4 min-w-[min(90vw,320px)]"
            onClick={() => setVoucherPhase("scanning")}
          >
            {t("checkIn.display.scanVoucherButton")}
          </button>
        )}

        <p className="text-xs text-[var(--foreground-muted)] max-w-sm">
          {t("checkIn.display.footerHint")}
        </p>
      </div>
    </div>
  );
}

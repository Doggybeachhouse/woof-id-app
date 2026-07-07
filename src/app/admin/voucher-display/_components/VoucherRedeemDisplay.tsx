"use client";

import { useCallback, useState } from "react";

import { BarcodeScanner } from "@/app/receipts/_components/BarcodeScanner";
import { DbhLogo } from "@/app/_components/DbhLogo";
import { useI18n } from "@/i18n/client";

type ScanState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "processing" }
  | {
      phase: "success";
      rewardTitle: string;
      dogName: string;
      code: string;
    }
  | {
      phase: "already_redeemed";
      rewardTitle: string;
      dogName: string;
      code: string;
    }
  | { phase: "error"; message: string };

export function VoucherRedeemDisplay() {
  const { t } = useI18n();
  const [state, setState] = useState<ScanState>({ phase: "idle" });

  const reset = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  async function handleDetected(rawCode: string) {
    setState({ phase: "processing" });

    try {
      const res = await fetch("/api/admin/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: rawCode }),
      });
      const data = await res.json();

      if (data.ok && data.voucher) {
        setState({
          phase: "success",
          rewardTitle: data.voucher.rewardTitle,
          dogName: data.voucher.dogName,
          code: data.voucher.code,
        });
        return;
      }

      if (data.errorCode === "already_redeemed" && data.voucher) {
        setState({
          phase: "already_redeemed",
          rewardTitle: data.voucher.rewardTitle,
          dogName: data.voucher.dogName,
          code: data.voucher.code,
        });
        return;
      }

      const message =
        data.errorCode === "cancelled"
          ? t("admin.voucherDisplay.errors.cancelled")
          : data.errorCode === "not_found"
            ? t("admin.voucherDisplay.errors.notFound")
            : t("admin.voucherDisplay.errors.notFound");

      setState({ phase: "error", message });
    } catch {
      setState({
        phase: "error",
        message: t("errors.admin.connectionFailed"),
      });
    }
  }

  return (
    <div className="checkin-display fixed inset-0 z-[200] overflow-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 text-center space-y-8">
        <div className="space-y-3">
          <DbhLogo className="mx-auto h-24 w-24" href={null} />
          <h1 className="font-display text-4xl sm:text-5xl text-[var(--accent-pink)]">
            {t("admin.voucherDisplay.title")}
          </h1>
          <p className="text-[var(--foreground-muted)] max-w-md mx-auto">
            {t("admin.voucherDisplay.instructions")}
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          {state.phase === "idle" && (
            <button
              type="button"
              className="btn btn-primary w-full text-lg py-4"
              onClick={() => setState({ phase: "scanning" })}
            >
              {t("admin.voucherDisplay.scanButton")}
            </button>
          )}

          {state.phase === "scanning" && (
            <div className="card-luxe p-5 space-y-4 text-left">
              <p className="text-sm text-center text-[var(--foreground-muted)]">
                {t("admin.voucherDisplay.scanningHint")}
              </p>
              <BarcodeScanner
                facingMode="user"
                onDetected={(code) => void handleDetected(code)}
                disabled={false}
              />
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={reset}
              >
                {t("admin.voucherDisplay.cancelScan")}
              </button>
            </div>
          )}

          {state.phase === "processing" && (
            <div className="card-luxe p-8">
              <p className="text-lg font-semibold">{t("common.busy")}</p>
            </div>
          )}

          {state.phase === "success" && (
            <div className="card-luxe p-8 space-y-3 border-green-200 bg-green-50">
              <p className="text-4xl" aria-hidden>
                ✅
              </p>
              <h2 className="font-display text-3xl text-green-900">
                {t("admin.voucherDisplay.successTitle")}
              </h2>
              <p className="text-green-800">
                {t("admin.voucherDisplay.successBody", {
                  rewardTitle: state.rewardTitle,
                  dogName: state.dogName,
                })}
              </p>
              <p className="font-mono text-xs text-green-700/80">{state.code}</p>
              <button type="button" className="btn btn-primary w-full mt-4" onClick={reset}>
                {t("admin.voucherDisplay.nextCustomer")}
              </button>
            </div>
          )}

          {state.phase === "already_redeemed" && (
            <div className="card-luxe p-8 space-y-3 border-amber-200 bg-amber-50">
              <p className="text-4xl" aria-hidden>
                ⚠️
              </p>
              <h2 className="font-display text-3xl text-amber-950">
                {t("admin.voucherDisplay.alreadyRedeemedTitle")}
              </h2>
              <p className="text-amber-900">
                {t("admin.voucherDisplay.alreadyRedeemedBody")}
              </p>
              <p className="text-sm text-amber-800">
                {state.rewardTitle} — {state.dogName}
              </p>
              <p className="font-mono text-xs text-amber-700/80">{state.code}</p>
              <button type="button" className="btn btn-secondary w-full mt-4" onClick={reset}>
                {t("admin.voucherDisplay.nextCustomer")}
              </button>
            </div>
          )}

          {state.phase === "error" && (
            <div className="card-luxe p-8 space-y-3 border-red-200 bg-red-50">
              <h2 className="font-display text-2xl text-red-800">
                {t("admin.voucherDisplay.errors.title")}
              </h2>
              <p className="text-red-700">{state.message}</p>
              <button type="button" className="btn btn-secondary w-full mt-4" onClick={reset}>
                {t("admin.voucherDisplay.tryAgain")}
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--foreground-muted)] max-w-sm">
          {t("admin.voucherDisplay.footerHint")}
        </p>
      </div>
    </div>
  );
}

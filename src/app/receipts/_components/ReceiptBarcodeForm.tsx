"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  claimReceiptBarcodeFormAction,
  type ClaimReceiptBarcodeState,
} from "@/app/receipts/actions";
import { BarcodeScanner } from "@/app/receipts/_components/BarcodeScanner";
import { useI18n } from "@/i18n/client";
import { isReceiptErrorCode, RECEIPT_ERROR, RECEIPT_ERROR_I18N_DETAIL_KEY, RECEIPT_ERROR_I18N_KEY } from "@/lib/receipts/errors";

const initialState: ClaimReceiptBarcodeState = {};

function hapticSuccess() {
  try {
    navigator.vibrate?.(40);
  } catch {
    /* unsupported */
  }
}

function ScannerSection({
  scanKey,
  redirecting,
  onDetected,
}: {
  scanKey: number;
  redirecting: boolean;
  onDetected: (code: string) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <BarcodeScanner
      key={scanKey}
      disabled={pending || redirecting}
      scanMode="barcode"
      autoStart
      hideControls
      onDetected={onDetected}
    />
  );
}

function FormBody({
  dogs,
  defaultDogId,
  mplusReady,
  state,
  formAction,
}: {
  dogs: { id: string; name: string; woofId: string }[];
  defaultDogId?: string;
  mplusReady: boolean;
  state: ClaimReceiptBarcodeState;
  formAction: (payload: FormData) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dogProfileId, setDogProfileId] = useState(
    defaultDogId ?? dogs[0]?.id ?? "",
  );
  const [barcode, setBarcode] = useState("");
  const [scanKey, setScanKey] = useState(0);

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [state.redirectTo, router]);

  function retryScan() {
    setBarcode("");
    setScanKey((key) => key + 1);
  }

  function submitScannedCode(code: string) {
    const value = code.trim();
    if (!value || !dogProfileId || state.redirectTo) return;
    hapticSuccess();
    setBarcode(value);
    formRef.current?.requestSubmit();
  }

  const errorCode = state.error && isReceiptErrorCode(state.error) ? state.error : null;
  const errorMessage = state.error
    ? errorCode
      ? t(`errors.receipts.${RECEIPT_ERROR_I18N_KEY[errorCode]}`)
      : state.error
    : "";
  const errorDetail =
    errorCode && RECEIPT_ERROR_I18N_DETAIL_KEY[errorCode]
      ? errorCode === RECEIPT_ERROR.ALREADY_CLAIMED && state.claimedCoins
        ? t(`errors.receipts.${RECEIPT_ERROR_I18N_DETAIL_KEY[errorCode]}`, {
            count: state.claimedCoins,
          })
        : t(`errors.receipts.${RECEIPT_ERROR_I18N_DETAIL_KEY[errorCode]}`)
      : "";

  return (
    <form ref={formRef} action={formAction} className="card p-6 space-y-4">
      <input type="hidden" name="dogProfileId" value={dogProfileId} />
      <input type="hidden" name="barcode" value={barcode} />

      <div>
        <label className="label" htmlFor="dogProfileId">
          {t("receipts.barcodeForm.dogLabel")}
        </label>
        <select
          id="dogProfileId"
          className="input"
          value={dogProfileId}
          onChange={(e) => setDogProfileId(e.target.value)}
          required
        >
          {dogs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.woofId})
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <ScannerSection
          scanKey={scanKey}
          redirecting={Boolean(state.redirectTo)}
          onDetected={submitScannedCode}
        />
      </div>

      {errorMessage && (
        <div className="space-y-2" role="alert">
          <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          {errorDetail && (
            <p className="text-sm text-red-600/90">{errorDetail}</p>
          )}
          <p className="text-xs text-black/55">{t("receipts.scanner.alignBarcodeBottom")}</p>
          <button
            type="button"
            className="btn btn-secondary w-full text-sm"
            onClick={retryScan}
          >
            {t("receipts.barcodeForm.retryScan")}
          </button>
        </div>
      )}

      {!mplusReady && (
        <p className="text-xs text-black/55 text-center">
          {t("receipts.barcodeForm.mplusPending")}
        </p>
      )}
    </form>
  );
}

export function ReceiptBarcodeForm({
  dogs,
  defaultDogId,
  mplusReady,
}: {
  dogs: { id: string; name: string; woofId: string }[];
  defaultDogId?: string;
  mplusReady: boolean;
}) {
  const [state, formAction] = useActionState(
    claimReceiptBarcodeFormAction,
    initialState,
  );

  return (
    <FormBody
      dogs={dogs}
      defaultDogId={defaultDogId}
      mplusReady={mplusReady}
      state={state}
      formAction={formAction}
    />
  );
}

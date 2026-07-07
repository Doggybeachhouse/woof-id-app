"use client";

import { useState, useTransition } from "react";

import { claimReceiptBarcodeAction } from "@/app/receipts/actions";
import { BarcodeScanner } from "@/app/receipts/_components/BarcodeScanner";
import { useI18n } from "@/i18n/client";

export function ReceiptBarcodeForm({
  dogs,
  defaultDogId,
  mplusReady,
}: {
  dogs: { id: string; name: string; woofId: string }[];
  defaultDogId?: string;
  mplusReady: boolean;
}) {
  const { t } = useI18n();
  const [dogProfileId, setDogProfileId] = useState(
    defaultDogId ?? dogs[0]?.id ?? "",
  );
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(code?: string) {
    const value = (code ?? barcode).trim();
    if (!value || !dogProfileId) {
      setError(t("errors.receipts.selectDogAndBarcode"));
      return;
    }
    setError("");
    const formData = new FormData();
    formData.set("dogProfileId", dogProfileId);
    formData.set("barcode", value);
    startTransition(async () => {
      try {
        await claimReceiptBarcodeAction(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.receipts.failed"));
      }
    });
  }

  return (
    <div className="card p-6 space-y-4">
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

      <BarcodeScanner
        disabled={pending}
        onDetected={(code) => {
          setBarcode(code);
          submit(code);
        }}
      />

      <div>
        <label className="label" htmlFor="barcode">
          {t("receipts.barcodeForm.barcodeLabel")}
        </label>
        <input
          id="barcode"
          className="input font-mono"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder={t("receipts.barcodeForm.barcodePlaceholder")}
          inputMode="numeric"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        className="btn btn-primary w-full text-lg"
        disabled={pending || !barcode.trim()}
        onClick={() => submit()}
      >
        {pending ? t("receipts.barcodeForm.submitLoading") : t("receipts.barcodeForm.submit")}
      </button>

      {!mplusReady && (
        <p className="text-xs text-black/55 text-center">
          {t("receipts.barcodeForm.mplusPending")}
        </p>
      )}
    </div>
  );
}

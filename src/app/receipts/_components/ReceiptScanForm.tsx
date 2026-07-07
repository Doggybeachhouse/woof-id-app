"use client";

import { useState } from "react";

import { scanReceiptAction } from "@/app/receipts/actions";
import { useI18n } from "@/i18n/client";

export function ReceiptScanForm({
  dogs,
  defaultDogId,
}: {
  dogs: { id: string; name: string; woofId: string }[];
  defaultDogId?: string;
}) {
  const { t } = useI18n();
  const [dogProfileId, setDogProfileId] = useState(
    defaultDogId ?? dogs[0]?.id ?? "",
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !dogProfileId) {
      setError(t("errors.receipts.selectDogAndPhoto"));
      return;
    }
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.set("dogProfileId", dogProfileId);
    formData.set("image", file);
    try {
      await scanReceiptAction(formData);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : t("errors.receipts.scanFailed"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <div>
        <label className="label" htmlFor="dogProfileId">
          {t("receipts.photoForm.dogLabel")}
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

      <div>
        <label className="label" htmlFor="receipt-image">
          {t("receipts.photoForm.photoLabel")}
        </label>
        <input
          id="receipt-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="input"
          onChange={onFileChange}
          required
        />
        <p className="text-xs text-black/50 mt-1">
          {t("receipts.photoForm.photoHint")}
        </p>
      </div>

      {preview && (
        <div className="rounded-xl overflow-hidden border border-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={t("receipts.photoForm.previewAlt")} className="w-full max-h-64 object-contain bg-white" />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="btn btn-primary w-full text-lg"
        disabled={loading}
      >
        {loading ? t("receipts.photoForm.submitLoading") : t("receipts.photoForm.submit")}
      </button>

      {loading && (
        <p className="text-xs text-center text-black/50">
          {t("receipts.photoForm.processingHint")}
        </p>
      )}
    </form>
  );
}

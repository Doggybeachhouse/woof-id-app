"use client";

import { useMemo, useState } from "react";

import { confirmReceiptAction } from "@/app/receipts/actions";
import { useI18n } from "@/i18n/client";
import { coinsFromPurchaseEur } from "@/lib/gamification/receiptCoins";
import type { ProductCategory } from "@prisma/client";

export type ReviewItem = {
  rawName: string;
  normalizedName: string;
  quantity: number;
  category: ProductCategory;
};

function parseEuroInput(value: string): number {
  const parsed = parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function ReceiptReviewForm({
  receiptId,
  initialItems,
  initialPurchaseTotalEur,
  fromMplus = false,
}: {
  receiptId: string;
  initialItems: ReviewItem[];
  initialPurchaseTotalEur: number;
  fromMplus?: boolean;
}) {
  const { t } = useI18n();
  const [purchaseTotal, setPurchaseTotal] = useState(
    initialPurchaseTotalEur > 0 ? initialPurchaseTotalEur.toFixed(2) : "",
  );
  const [error, setError] = useState("");

  const coins = useMemo(
    () => coinsFromPurchaseEur(parseEuroInput(purchaseTotal)),
    [purchaseTotal],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const totalEur = parseEuroInput(purchaseTotal);
    if (totalEur <= 0) {
      setError(t("errors.receipts.invalidPurchaseTotal"));
      return;
    }
    const formData = new FormData();
    formData.set("receiptId", receiptId);
    formData.set("purchaseTotalEur", purchaseTotal.replace(",", "."));
    formData.set("useStoredItems", "true");
    try {
      await confirmReceiptAction(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.receipts.saveFailed"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-black/60">
        {fromMplus ? t("receipts.review.introMplus") : t("receipts.review.intro")}
      </p>

      <div className="card p-3 bg-[#ffde5b]/20 text-center space-y-3">
        <div>
          <label className="label text-left" htmlFor="purchaseTotalEur">
            {t("receipts.review.purchaseTotalLabel")}
          </label>
          <input
            id="purchaseTotalEur"
            className="input text-center text-lg font-semibold"
            inputMode="decimal"
            placeholder={t("receipts.review.purchaseTotalPlaceholder")}
            value={purchaseTotal}
            onChange={(e) => setPurchaseTotal(e.target.value)}
            required
          />
          <p className="text-xs text-black/50 mt-1 text-left">
            {t("receipts.review.purchaseTotalHint")}
          </p>
        </div>
        <span className="coin-badge">
          {t("receipts.review.coinsAfterConfirm", { count: coins })}
        </span>
      </div>

      {initialItems.length > 0 && (
        <ul className="space-y-2">
          {initialItems.map((item, index) => (
            <li
              key={index}
              className="card p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.normalizedName || item.rawName}
                </p>
                {item.rawName &&
                  item.rawName !== item.normalizedName && (
                    <p className="text-xs text-black/45 truncate">
                      {t("receipts.review.onReceipt")} {item.rawName}
                    </p>
                  )}
              </div>
              <span className="text-sm text-black/50 shrink-0">
                ×{item.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn btn-primary w-full text-lg">
        {t("receipts.review.submit")}
      </button>
    </form>
  );
}

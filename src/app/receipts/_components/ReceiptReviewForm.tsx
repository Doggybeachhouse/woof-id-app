"use client";

import { useState } from "react";

import { confirmReceiptAction } from "@/app/receipts/actions";
import { useI18n } from "@/i18n/client";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/receipts/categories";
import type { ProductCategory } from "@prisma/client";

export type ReviewItem = {
  rawName: string;
  normalizedName: string;
  quantity: number;
  category: ProductCategory;
};

export function ReceiptReviewForm({
  receiptId,
  initialItems,
}: {
  receiptId: string;
  initialItems: ReviewItem[];
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [error, setError] = useState("");

  const unitCount = items.reduce(
    (sum, item) => sum + Math.max(1, item.quantity),
    0,
  );

  function updateItem(index: number, patch: Partial<ReviewItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        rawName: "",
        normalizedName: "",
        quantity: 1,
        category: "OTHER",
      },
    ]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const valid = items.filter((i) => i.normalizedName.trim());
    if (valid.length === 0) {
      setError(t("errors.receipts.addNamedProduct"));
      return;
    }
    const formData = new FormData();
    formData.set("receiptId", receiptId);
    formData.set(
      "items",
      JSON.stringify(
        valid.map((i) => ({
          rawName: i.rawName || i.normalizedName,
          normalizedName: i.normalizedName,
          quantity: i.quantity,
          category: i.category,
        })),
      ),
    );
    try {
      await confirmReceiptAction(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.receipts.saveFailed"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-black/60">
        {t("receipts.review.intro")}
      </p>

      <div className="card p-3 bg-[#ffde5b]/20 text-center">
        <span className="coin-badge">{t("receipts.review.coinsAfterConfirm", { count: unitCount })}</span>
        <p className="text-xs text-black/50 mt-1">
          {unitCount === 1
            ? t("receipts.review.itemsSingular", { count: unitCount })
            : t("receipts.review.itemsPlural", { count: unitCount })}
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-black/40">
                {t("receipts.review.productNumber", { number: index + 1 })}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-xs text-red-600 font-semibold"
                >
                  {t("receipts.review.remove")}
                </button>
              )}
            </div>
            {item.rawName && item.rawName !== item.normalizedName && (
              <p className="text-xs text-black/45">
                {t("receipts.review.onReceipt")} <em>{item.rawName}</em>
              </p>
            )}
            <div>
              <label className="label">{t("receipts.review.productNameLabel")}</label>
              <input
                className="input"
                value={item.normalizedName}
                onChange={(e) =>
                  updateItem(index, { normalizedName: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t("receipts.review.quantityLabel")}</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  className="input"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, {
                      quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                />
              </div>
              <div>
                <label className="label">{t("receipts.review.categoryLabel")}</label>
                <select
                  className="input"
                  value={item.category}
                  onChange={(e) =>
                    updateItem(index, {
                      category: e.target.value as ProductCategory,
                    })
                  }
                >
                  {PRODUCT_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <button type="button" onClick={addItem} className="btn btn-secondary w-full">
        {t("receipts.review.addProduct")}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn btn-primary w-full text-lg">
        {t("receipts.review.submit")}
      </button>
    </form>
  );
}

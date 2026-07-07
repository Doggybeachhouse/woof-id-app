"use client";

import { useMemo, useState, useTransition } from "react";

import { manualReceiptAction } from "@/app/receipts/actions";
import { useI18n } from "@/i18n/client";
import type { CatalogProduct } from "@/lib/catalog/products";

type DogOption = { id: string; name: string; woofId: string };

type LineItem = {
  key: string;
  product: CatalogProduct;
  quantity: number;
};

export function ManualReceiptForm({
  dogs,
  products,
  defaultDogId,
}: {
  dogs: DogOption[];
  products: CatalogProduct[];
  defaultDogId?: string;
}) {
  const { t } = useI18n();
  const [dogId, setDogId] = useState(defaultDogId ?? dogs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.articleNumber.includes(q),
      )
      .slice(0, 30);
  }, [products, query]);

  function addProduct(product: CatalogProduct) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.articleNumber === product.articleNumber);
      if (existing) {
        return prev.map((l) =>
          l.product.articleNumber === product.articleNumber
            ? { ...l, quantity: Math.min(99, l.quantity + 1) }
            : l,
        );
      }
      return [...prev, { key: product.articleNumber, product, quantity: 1 }];
    });
  }

  function updateQty(articleNumber: string, quantity: number) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.product.articleNumber === articleNumber
            ? { ...l, quantity: Math.max(1, Math.min(99, quantity)) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(articleNumber: string) {
    setLines((prev) => prev.filter((l) => l.product.articleNumber !== articleNumber));
  }

  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

  function submit() {
    setError(null);
    if (!dogId) {
      setError(t("errors.receipts.selectDog"));
      return;
    }
    if (lines.length === 0) {
      setError(t("errors.receipts.addProduct"));
      return;
    }

    const formData = new FormData();
    formData.set("dogProfileId", dogId);
    formData.set(
      "items",
      JSON.stringify(
        lines.map((l) => ({
          articleNumber: l.product.articleNumber,
          name: l.product.name,
          quantity: l.quantity,
        })),
      ),
    );

    startTransition(async () => {
      try {
        await manualReceiptAction(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.receipts.saveFailed"));
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-3">
        <label className="block text-sm font-semibold">
          {t("receipts.manualForm.dogLabel")}
          <select
            className="mt-1 w-full border border-black/15 rounded-xl px-3 py-2"
            value={dogId}
            onChange={(e) => setDogId(e.target.value)}
          >
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.woofId})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold">
          {t("receipts.manualForm.searchLabel")}
          <input
            className="mt-1 w-full border border-black/15 rounded-xl px-3 py-2"
            placeholder={t("receipts.manualForm.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <ul className="max-h-48 overflow-y-auto divide-y divide-black/5 border border-black/10 rounded-xl">
          {filtered.length === 0 ? (
            <li className="p-3 text-sm text-black/50">{t("receipts.manualForm.noProducts")}</li>
          ) : (
            filtered.map((p) => (
              <li key={p.articleNumber}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-[#fff0f4] text-sm"
                  onClick={() => addProduct(p)}
                >
                  <span className="font-semibold">{p.name}</span>
                  {p.priceEur != null && (
                    <span className="text-black/50 ml-2">€{p.priceEur.toFixed(2)}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {lines.length > 0 && (
        <div className="card p-4 space-y-3">
          <h2 className="font-display text-xl">{t("receipts.manualForm.receiptTitle")}</h2>
          <ul className="space-y-2">
            {lines.map((l) => (
              <li
                key={l.key}
                className="flex items-center gap-2 justify-between text-sm"
              >
                <span className="flex-1 font-medium">{l.product.name}</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  className="w-16 border border-black/15 rounded-lg px-2 py-1 text-center"
                  value={l.quantity}
                  onChange={(e) =>
                    updateQty(l.product.articleNumber, Number(e.target.value))
                  }
                />
                <button
                  type="button"
                  className="text-black/40 hover:text-[#ff416e]"
                  onClick={() => removeLine(l.product.articleNumber)}
                  aria-label={t("receipts.manualForm.removeAriaLabel")}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-black/60">
            {totalUnits === 1
              ? t("receipts.manualForm.totalSingular", { count: totalUnits, coins: totalUnits })
              : t("receipts.manualForm.totalPlural", { count: totalUnits, coins: totalUnits })}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={pending || lines.length === 0}
        onClick={submit}
      >
        {pending ? t("receipts.manualForm.submitLoading") : t("receipts.manualForm.submit")}
      </button>
    </div>
  );
}

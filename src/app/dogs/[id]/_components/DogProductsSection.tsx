"use client";

import { useState } from "react";
import type { ProductCategory } from "@prisma/client";

import { ProductThumb } from "@/app/dogs/[id]/_components/ProductThumb";
import { useI18n } from "@/i18n/client";

export type FavoriteProductView = {
  normalizedName: string;
  totalQuantity: number;
  articleNumber: string | null;
  category: ProductCategory;
};

export type RecentPurchaseView = {
  key: string;
  normalizedName: string;
  quantity: number;
  purchasedAtLabel: string;
  articleNumber: string | null;
  category: ProductCategory;
};

type DogProductsSectionProps = {
  favorites: FavoriteProductView[];
  recentPurchases: RecentPurchaseView[];
  favoritePreviewCount?: number;
};

export function DogProductsSection({
  favorites,
  recentPurchases,
  favoritePreviewCount = 2,
}: DogProductsSectionProps) {
  const { t } = useI18n();
  const [showRecent, setShowRecent] = useState(false);

  const visibleFavorites = favorites.slice(0, favoritePreviewCount);

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-display text-xl">{t("dogs.detail.favoriteProductsTitle")}</h2>
      {visibleFavorites.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">
          {t("dogs.detail.favoriteProductsEmpty")}
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {visibleFavorites.map((product) => (
            <li
              key={product.normalizedName}
              className="flex items-center gap-3 border-t border-[var(--card-border)] pt-2 first:border-t-0 first:pt-0"
            >
              <ProductThumb
                articleNumber={product.articleNumber}
                category={product.category}
                name={product.normalizedName}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{product.normalizedName}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {t("dogs.detail.favoriteProductsCount", {
                    count: product.totalQuantity,
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {recentPurchases.length > 0 && (
        <div className="pt-1">
          {!showRecent ? (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
              onClick={() => setShowRecent(true)}
            >
              {t("dogs.detail.recentPurchasesShow")}
            </button>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                {t("dogs.detail.recentPurchasesTitle")}
              </h3>
              <ul className="space-y-2 text-sm">
                {recentPurchases.map((purchase) => (
                  <li
                    key={purchase.key}
                    className="flex items-center gap-3 border-t border-[var(--card-border)] pt-2 first:border-t-0 first:pt-0"
                  >
                    <ProductThumb
                      articleNumber={purchase.articleNumber}
                      category={purchase.category}
                      name={purchase.normalizedName}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{purchase.normalizedName}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {purchase.purchasedAtLabel}
                        {purchase.quantity > 1 ? ` · ×${purchase.quantity}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {recentPurchases.length === 0 && (
        <p className="text-sm text-[var(--foreground-muted)]">
          {t("dogs.detail.recentPurchasesEmpty")}
        </p>
      )}
    </section>
  );
}

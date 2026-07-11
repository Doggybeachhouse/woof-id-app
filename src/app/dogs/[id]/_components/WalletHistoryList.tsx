"use client";

import { useState } from "react";

import { useI18n } from "@/i18n/client";

export type WalletHistoryEntryView = {
  key: string;
  label: string;
  when: string;
  amountLabel: string;
};

type WalletHistoryListProps = {
  entries: WalletHistoryEntryView[];
  previewCount?: number;
};

export function WalletHistoryList({
  entries,
  previewCount = 3,
}: WalletHistoryListProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  const hasMore = entries.length > previewCount;
  const visible = expanded ? entries : entries.slice(0, previewCount);

  return (
    <div className="space-y-2 pt-1">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
        {t("dogs.detail.walletHistoryTitle")}
      </h3>
      <ul className="space-y-2 text-sm">
        {visible.map((entry) => (
          <li
            key={entry.key}
            className="flex items-start justify-between gap-3 border-t border-[var(--card-border)] pt-2 first:border-t-0 first:pt-0"
          >
            <div className="min-w-0">
              <p className="font-medium">{entry.label}</p>
              <p className="text-xs text-[var(--foreground-muted)]">{entry.when}</p>
            </div>
            <span className="font-mono shrink-0">{entry.amountLabel}</span>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? t("dogs.detail.walletHistoryShowLess")
            : t("dogs.detail.walletHistoryShowMore")}
        </button>
      )}
    </div>
  );
}

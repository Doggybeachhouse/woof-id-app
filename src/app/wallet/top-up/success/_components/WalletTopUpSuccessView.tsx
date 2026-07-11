"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/client";

const PENDING_ORDER_KEY = "woof_topup_order_id";
const PENDING_DOG_KEY = "woof_topup_dog_id";
const PENDING_STARTED_KEY = "woof_topup_started_at";
const MAX_PENDING_MS = 30 * 60 * 1000;

function clearPendingTopUp(): void {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
  sessionStorage.removeItem(PENDING_DOG_KEY);
  sessionStorage.removeItem(PENDING_STARTED_KEY);
}

function readPendingTopUp(): { orderId: number; dogProfileId: string } | null {
  const orderId = Number(sessionStorage.getItem(PENDING_ORDER_KEY) ?? 0);
  const dogProfileId = sessionStorage.getItem(PENDING_DOG_KEY)?.trim() ?? "";
  const startedAt = Number(sessionStorage.getItem(PENDING_STARTED_KEY) ?? 0);
  if (orderId <= 0 || !dogProfileId || startedAt <= 0) {
    return null;
  }
  if (Date.now() - startedAt > MAX_PENDING_MS) {
    clearPendingTopUp();
    return null;
  }
  return { orderId, dogProfileId };
}

function GreenCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity={0.15} />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}

export function WalletTopUpSuccessView() {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(false);
  const [newBalanceEur, setNewBalanceEur] = useState<number | null>(null);
  const completionStarted = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (completionStarted.current) {
      return;
    }
    completionStarted.current = true;

    async function completeTopUp() {
      const pending = readPendingTopUp();
      if (!pending) {
        return;
      }

      try {
        const response = await fetch("/api/wallet/topup/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: pending.orderId,
            dogProfileId: pending.dogProfileId,
          }),
        });
        if (response.ok) {
          const data = (await response.json()) as { newBalanceEur?: number };
          if (typeof data.newBalanceEur === "number") {
            setNewBalanceEur(data.newBalanceEur);
          }
        }
      } catch {
        // Balance cache update is best-effort; success page still shows confirmation.
      } finally {
        clearPendingTopUp();
      }
    }

    void completeTopUp();
  }, []);

  return (
    <div
      className={`card-luxe p-8 max-w-lg mx-auto text-center space-y-4 transition-opacity duration-300 ${
        revealed ? "opacity-100" : "opacity-0"
      }`}
    >
      <GreenCheckIcon
        className={`voucher-check-pop mx-auto h-20 w-20 text-green-600 ${
          revealed ? "" : "opacity-0"
        }`}
      />
      <h1 className="font-display text-3xl">{t("wallet.topUp.successTitle")}</h1>
      <p className="text-[var(--foreground-muted)]">{t("wallet.topUp.successBody")}</p>
      {newBalanceEur != null && (
        <p className="font-display text-2xl text-[var(--accent-primary)]">
          {t("wallet.topUp.successBalance", {
            balance: newBalanceEur.toFixed(2),
          })}
        </p>
      )}
      <div className="flex flex-col gap-3 pt-4">
        <Link href="/dogs" className="btn btn-primary">
          {t("wallet.topUp.toDogs")}
        </Link>
        <Link href="/wallet/top-up" className="text-sm underline text-black/60">
          {t("wallet.topUp.title")}
        </Link>
      </div>
    </div>
  );
}

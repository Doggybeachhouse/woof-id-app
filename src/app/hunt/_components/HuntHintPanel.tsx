"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useI18n } from "@/i18n/client";
import { HUNT_HINT_PRICE_EUR } from "@/lib/scavengerHunt/constants";

import {
  clearPendingHuntHint,
  HuntHintReturnWatcher,
  setPendingHuntHint,
} from "./HuntHintReturnWatcher";

type HintPanelProps = {
  dogId: string;
  huntSlug: string;
  checkpointIndex: number;
};

type HintStatus = {
  revealed: boolean;
  hintText: string | null;
  freeHintUsed: boolean;
  canUseFreeHint: boolean;
  needsPurchase: boolean;
  priceEur: string;
};

export function HuntHintPanel({ dogId, huntSlug, checkpointIndex }: HintPanelProps) {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<HintStatus | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const params = new URLSearchParams({
      dogId,
      huntSlug,
      checkpointIndex: String(checkpointIndex),
      locale,
    });
    const res = await fetch(`/api/hunt/hint?${params}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HintStatus;
  }, [checkpointIndex, dogId, huntSlug, locale]);

  const refreshStatus = useCallback(async () => {
    const data = await fetchStatus();
    if (data) {
      setStatus(data);
      if (data.revealed && data.hintText) {
        setHintText(data.hintText);
        setExpanded(true);
      }
    }
  }, [fetchStatus]);

  useEffect(() => {
    setError(null);
    setExpanded(false);
    void refreshStatus();
  }, [refreshStatus]);

  const completeReturn = useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/hunt/hint/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, locale, consume: true }),
        });
        const data = (await res.json()) as {
          error?: string;
          hintText?: string;
          pending?: boolean;
        };
        if (!res.ok) {
          if (data.pending) {
            setError(t("hunt.hints.paymentPending"));
          } else {
            setError(t("hunt.hints.errors.generic"));
          }
          return;
        }
        clearPendingHuntHint();
        if (data.hintText) {
          setHintText(data.hintText);
          setExpanded(true);
        }
        await refreshStatus();
        const url = new URL(window.location.href);
        url.searchParams.delete("hintReturn");
        window.history.replaceState({}, "", url.toString());
      } catch {
        setError(t("hunt.hints.errors.generic"));
      } finally {
        setLoading(false);
      }
    },
    [locale, refreshStatus, t],
  );

  useEffect(() => {
    const token = searchParams.get("hintReturn")?.trim();
    if (token) {
      void completeReturn(token);
    }
  }, [completeReturn, searchParams]);

  async function handleRevealFree() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hunt/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dogId, huntSlug, checkpointIndex, locale }),
      });
      const data = (await res.json()) as {
        error?: string;
        hintText?: string;
        needsPurchase?: boolean;
      };
      if (!res.ok) {
        if (data.needsPurchase) {
          await refreshStatus();
        } else {
          setError(t("hunt.hints.errors.generic"));
        }
        return;
      }
      if (data.hintText) {
        setHintText(data.hintText);
        setExpanded(true);
      }
      await refreshStatus();
    } catch {
      setError(t("hunt.hints.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase() {
    setPurchasing(true);
    setError(null);
    try {
      const res = await fetch("/api/hunt/hint/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dogId, huntSlug, checkpointIndex }),
      });
      const data = (await res.json()) as {
        error?: string;
        checkoutUrl?: string;
        orderId?: number;
      };
      if (!res.ok) {
        setError(data.error ?? t("hunt.hints.errors.purchase"));
        return;
      }
      if (data.orderId && data.orderId > 0) {
        setPendingHuntHint(data.orderId, checkpointIndex);
      }
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
      }
    } catch {
      setError(t("hunt.hints.errors.purchase"));
    } finally {
      setPurchasing(false);
    }
  }

  const revealed = status?.revealed ?? Boolean(hintText);
  const canUseFree = status?.canUseFreeHint ?? false;
  const needsPurchase = status?.needsPurchase ?? false;
  const price = status?.priceEur ?? HUNT_HINT_PRICE_EUR;

  return (
    <>
      <HuntHintReturnWatcher
        dogId={dogId}
        huntSlug={huntSlug}
        locale={locale}
        onPaidHint={(idx, text) => {
          if (text) {
            setHintText(text);
            setExpanded(true);
          }
          void refreshStatus();
        }}
      />
      <div className="hunt-hint-panel">
        {!revealed && (
          <div className="hunt-hint-panel__actions">
            {canUseFree ? (
              <button
                type="button"
                className="btn hunt-hint-btn"
                disabled={loading || purchasing}
                onClick={() => void handleRevealFree()}
              >
                <span className="hunt-hint-btn__icon" aria-hidden>
                  💡
                </span>
                {loading ? t("hunt.hints.loading") : t("hunt.hints.button")}
              </button>
            ) : needsPurchase ? (
              <button
                type="button"
                className="btn hunt-hint-btn hunt-hint-btn--paid"
                disabled={loading || purchasing}
                onClick={() => void handlePurchase()}
              >
                <span className="hunt-hint-btn__icon" aria-hidden>
                  💡
                </span>
                {purchasing
                  ? t("hunt.hints.purchasing")
                  : t("hunt.hints.buy", { price })}
              </button>
            ) : null}
            {status?.freeHintUsed && !revealed && !needsPurchase && (
              <p className="hunt-hint-panel__note">{t("hunt.hints.freeUsed")}</p>
            )}
          </div>
        )}

        {revealed && hintText && (
          <div className="hunt-hint-reveal">
            <button
              type="button"
              className="hunt-hint-reveal__toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              <span className="hunt-hint-btn__icon" aria-hidden>
                💡
              </span>
              {expanded ? t("hunt.hints.hide") : t("hunt.hints.show")}
            </button>
            {expanded && (
              <div className="hunt-hint-reveal__body">
                <p className="hunt-hint-reveal__label">{t("hunt.hints.revealedLabel")}</p>
                <p className="hunt-hint-reveal__text">{hintText}</p>
              </div>
            )}
          </div>
        )}

        {error && <p className="hunt-hint-panel__error">{error}</p>}
      </div>
    </>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const PENDING_ORDER_KEY = "woof_hunt_hint_order_id";
const PENDING_CHECKPOINT_KEY = "woof_hunt_hint_checkpoint";
const PENDING_STARTED_KEY = "woof_hunt_hint_started_at";
const MAX_PENDING_MS = 30 * 60 * 1000;
const WATCH_PATH = "/hunt";

export function clearPendingHuntHint(): void {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
  sessionStorage.removeItem(PENDING_CHECKPOINT_KEY);
  sessionStorage.removeItem(PENDING_STARTED_KEY);
}

export function setPendingHuntHint(orderId: number, checkpointIndex: number): void {
  sessionStorage.setItem(PENDING_ORDER_KEY, String(orderId));
  sessionStorage.setItem(PENDING_CHECKPOINT_KEY, String(checkpointIndex));
  sessionStorage.setItem(PENDING_STARTED_KEY, String(Date.now()));
}

function getPendingHuntHint(): {
  orderId: number;
  checkpointIndex: number;
  startedAt: number;
} | null {
  const orderId = Number(sessionStorage.getItem(PENDING_ORDER_KEY) ?? 0);
  const checkpointIndex = Number(sessionStorage.getItem(PENDING_CHECKPOINT_KEY) ?? -1);
  const startedAt = Number(sessionStorage.getItem(PENDING_STARTED_KEY) ?? 0);
  if (orderId <= 0 || checkpointIndex < 0 || startedAt <= 0) {
    return null;
  }
  if (Date.now() - startedAt > MAX_PENDING_MS) {
    clearPendingHuntHint();
    return null;
  }
  return { orderId, checkpointIndex, startedAt };
}

type HuntHintReturnWatcherProps = {
  dogId: string;
  huntSlug: string;
  locale: string;
  onPaidHint?: (checkpointIndex: number, hintText: string) => void;
};

export function HuntHintReturnWatcher({
  dogId,
  huntSlug,
  locale,
  onPaidHint,
}: HuntHintReturnWatcherProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const checkingRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    if (pathname !== WATCH_PATH) {
      return;
    }

    const email = session?.user?.email?.trim().toLowerCase() ?? "";
    if (!email) {
      return;
    }

    async function checkPendingPayment(): Promise<void> {
      const pending = getPendingHuntHint();
      if (!pending || checkingRef.current) {
        return;
      }

      checkingRef.current = true;
      try {
        const response = await fetch(
          `/api/hunt/hint/status?orderId=${pending.orderId}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { paid?: boolean };
        if (data.paid) {
          const fulfillRes = await fetch("/api/hunt/hint/fulfill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dogId,
              huntSlug,
              checkpointIndex: pending.checkpointIndex,
              orderId: pending.orderId,
              locale,
            }),
          });
          const fulfillData = (await fulfillRes.json()) as { hintText?: string };
          clearPendingHuntHint();
          if (fulfillData.hintText) {
            onPaidHint?.(pending.checkpointIndex, fulfillData.hintText);
          } else {
            onPaidHint?.(pending.checkpointIndex, "");
          }
          router.refresh();
        }
      } finally {
        checkingRef.current = false;
      }
    }

    function onVisible(): void {
      if (document.visibilityState === "visible") {
        void checkPendingPayment();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [dogId, huntSlug, locale, onPaidHint, pathname, router, session?.user?.email, status]);

  return null;
}

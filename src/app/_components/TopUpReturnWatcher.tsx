"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const PENDING_ORDER_KEY = "woof_topup_order_id";
const PENDING_STARTED_KEY = "woof_topup_started_at";
const MAX_PENDING_MS = 30 * 60 * 1000;

function clearPendingTopUp(): void {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
  sessionStorage.removeItem(PENDING_STARTED_KEY);
}

function getPendingTopUp(): { orderId: number; startedAt: number } | null {
  const orderId = Number(sessionStorage.getItem(PENDING_ORDER_KEY) ?? 0);
  const startedAt = Number(sessionStorage.getItem(PENDING_STARTED_KEY) ?? 0);
  if (orderId <= 0 || startedAt <= 0) {
    return null;
  }
  if (Date.now() - startedAt > MAX_PENDING_MS) {
    clearPendingTopUp();
    return null;
  }
  return { orderId, startedAt };
}

export function TopUpReturnWatcher() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const checkingRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    if (pathname === "/wallet/top-up/success") {
      clearPendingTopUp();
      return;
    }

    const email = session?.user?.email?.trim().toLowerCase() ?? "";
    if (!email) {
      return;
    }

    async function checkPendingPayment(): Promise<void> {
      const pending = getPendingTopUp();
      if (!pending || checkingRef.current) {
        return;
      }

      checkingRef.current = true;
      try {
        const response = await fetch(
          `/api/wallet/topup/status?orderId=${pending.orderId}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { paid?: boolean };
        if (data.paid) {
          clearPendingTopUp();
          router.replace("/wallet/top-up/success");
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

    void checkPendingPayment();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [pathname, router, session?.user?.email, status]);

  return null;
}

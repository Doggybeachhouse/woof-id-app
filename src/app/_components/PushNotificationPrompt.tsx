"use client";

import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";
import { isPushSupported, isStandalonePwa, urlBase64ToUint8Array } from "@/lib/push/client";

type PushState = "unsupported" | "ios_hint" | "default" | "denied" | "subscribed" | "loading";

export function PushNotificationPrompt() {
  const { t } = useI18n();
  const [state, setState] = useState<PushState>("loading");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  const checkSubscription = useCallback(async () => {
    if (!isPushSupported()) {
      setState("unsupported");
      return;
    }

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIos && !isStandalonePwa()) {
      setState("ios_hint");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    setState(existing ? "subscribed" : "default");
  }, []);

  useEffect(() => {
    void checkSubscription();
  }, [checkSubscription]);

  async function subscribe() {
    if (!publicKey) return;

    setState("loading");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (!response.ok) {
        throw new Error("subscribe_failed");
      }

      setState("subscribed");
    } catch {
      await checkSubscription();
    }
  }

  async function unsubscribe() {
    setState("loading");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setState("default");
    } catch {
      await checkSubscription();
    }
  }

  if (state === "loading") {
    return (
      <section className="card p-6 space-y-3">
        <h2 className="font-display text-xl">{t("push.title")}</h2>
        <p className="text-sm text-black/60">{t("push.loading")}</p>
      </section>
    );
  }

  if (state === "unsupported") {
    return (
      <section className="card p-6 space-y-3">
        <h2 className="font-display text-xl">{t("push.title")}</h2>
        <p className="text-sm text-black/60">{t("push.unsupported")}</p>
      </section>
    );
  }

  return (
    <section className="card p-6 space-y-4">
      <h2 className="font-display text-xl">{t("push.title")}</h2>
      <p className="text-sm text-black/60">{t("push.description")}</p>

      {state === "ios_hint" && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {t("push.iosHint")}
        </p>
      )}

      {state === "denied" && (
        <p className="text-sm text-red-600">{t("push.denied")}</p>
      )}

      {state === "subscribed" ? (
        <>
          <p className="text-sm text-green-700">{t("push.subscribed")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => void unsubscribe()}>
            {t("push.unsubscribe")}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void subscribe()}
          disabled={state === "ios_hint" || !publicKey}
        >
          {t("push.enable")}
        </button>
      )}
    </section>
  );
}

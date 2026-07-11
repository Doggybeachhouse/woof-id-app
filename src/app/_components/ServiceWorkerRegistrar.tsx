"use client";

import { useEffect } from "react";

/** Bump when sw.js changes so browsers fetch a fresh worker (not a cached shell). */
const SW_VERSION = "2";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register(`/sw.js?v=${SW_VERSION}`)
      .then((registration) => {
        // Refresh push worker without forcing a navigation reload (reloads break cold PWA opens).
        void registration.update();
      })
      .catch(() => {
        // Registration can fail on insecure origins or unsupported browsers.
      });
  }, []);

  return null;
}

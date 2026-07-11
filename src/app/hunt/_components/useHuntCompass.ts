"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CompassStatus =
  | "unsupported"
  | "idle"
  | "calibrating"
  | "active"
  | "denied";

type DeviceOrientationWithWebkit = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type DeviceOrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function readDeviceHeading(event: DeviceOrientationEvent): number | null {
  const withWebkit = event as DeviceOrientationWithWebkit;
  if (typeof withWebkit.webkitCompassHeading === "number") {
    return withWebkit.webkitCompassHeading;
  }
  if (event.absolute && typeof event.alpha === "number" && !Number.isNaN(event.alpha)) {
    return (360 - event.alpha + 360) % 360;
  }
  return null;
}

function compassNeedsPermissionTap(): boolean {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return false;
  }
  const DOE = DeviceOrientationEvent as DeviceOrientationEventConstructor;
  return typeof DOE.requestPermission === "function";
}

export function useHuntCompass(enabled: boolean) {
  const [status, setStatus] = useState<CompassStatus>("idle");
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [needsPermissionTap, setNeedsPermissionTap] = useState(false);
  const listeningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingHeadingRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const applyHeading = useCallback((heading: number) => {
    pendingHeadingRef.current = heading;
    if (rafRef.current != null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const next = pendingHeadingRef.current;
      if (next == null) return;
      setDeviceHeading(next);
      setStatus("active");
    });
  }, []);

  const removeListeners = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    listeningRef.current = false;
  }, []);

  const attachListeners = useCallback(() => {
    if (listeningRef.current || typeof window === "undefined") return;
    listeningRef.current = true;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!listeningRef.current) return;
      const heading = readDeviceHeading(event);
      if (heading == null) {
        setStatus("calibrating");
        return;
      }
      applyHeading(heading);
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);

    cleanupRef.current = () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [applyHeading]);

  const requestAccess = useCallback(async () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setStatus("unsupported");
      return false;
    }

    const DOE = DeviceOrientationEvent as DeviceOrientationEventConstructor;

    try {
      if (typeof DOE.requestPermission === "function") {
        const result = await DOE.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return false;
        }
      }

      setStatus("calibrating");
      attachListeners();
      return true;
    } catch {
      setStatus("denied");
      return false;
    }
  }, [attachListeners]);

  useEffect(() => {
    if (!enabled) {
      removeListeners();
      return;
    }

    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setStatus("unsupported");
      return;
    }

    const requiresTap = compassNeedsPermissionTap();
    setNeedsPermissionTap(requiresTap);

    if (requiresTap) {
      setStatus("idle");
      return () => {
        removeListeners();
        if (rafRef.current != null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }

    setStatus("calibrating");
    attachListeners();

    return () => {
      removeListeners();
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, attachListeners, removeListeners]);

  return { status, deviceHeading, needsPermissionTap, requestAccess };
}

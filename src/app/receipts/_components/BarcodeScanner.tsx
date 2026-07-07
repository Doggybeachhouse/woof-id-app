"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/client";
import {
  getCameraVideoConstraints,
  type CameraFacingMode,
} from "@/lib/camera/constraints";

export type BarcodeScanMode = "qr" | "barcode" | "all";
export type { CameraFacingMode };

type Props = {
  onDetected: (code: string) => void;
  disabled?: boolean;
  /** Start the camera immediately when mounted (no extra tap). */
  autoStart?: boolean;
  /** Hide start/stop controls — parent handles cancel. */
  hideControls?: boolean;
  /** QR-only mode uses jsQR fallback (required on iOS Safari). */
  scanMode?: BarcodeScanMode;
  /** `user` = front/selfie camera (kiosk voucher scan); `environment` = rear (default). */
  facingMode?: CameraFacingMode;
};

const SCAN_INTERVAL_MS = 120;
const HOLD_STEADY_AFTER_ATTEMPTS = 24;

function looksLikeQr(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("http") ||
    trimmed.includes("/check-in") ||
    trimmed.startsWith("WOOF-")
  );
}

export function BarcodeScanner({
  onDetected,
  disabled,
  autoStart = false,
  hideControls = false,
  scanMode = "all",
  facingMode = "environment",
}: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "holdSteady">(
    "idle",
  );
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);
  const startGenerationRef = useRef(0);

  const stopCamera = useCallback(() => {
    startGenerationRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
    setScanStatus("idle");
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    const generation = ++startGenerationRef.current;
    setError("");
    detectedRef.current = false;
    setScanStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        getCameraVideoConstraints(facingMode),
      );
      if (generation !== startGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // Do not await play() — iOS Safari can hang indefinitely before resolving.
        void video.play().catch(() => {});
      }
      setActive(true);
    } catch {
      if (generation !== startGenerationRef.current) return;
      setError(t("errors.receipts.cameraUnavailable"));
      setSupported(false);
    }
  }, [facingMode, t]);

  useEffect(() => {
    if (!autoStart || disabled) return;
    void startCamera();
    return () => stopCamera();
  }, [autoStart, disabled, startCamera, stopCamera]);

  useEffect(() => {
    if (!active || disabled || typeof window === "undefined") return;

    const BarcodeDetectorCtor = (
      window as Window & {
        BarcodeDetector?: new (opts?: { formats: string[] }) => {
          detect: (src: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;

    const wantsQr = scanMode === "qr" || scanMode === "all";
    const wantsBarcode = scanMode === "barcode" || scanMode === "all";
    const canUseNative = Boolean(BarcodeDetectorCtor) && wantsBarcode;

    if (!canUseNative && !wantsQr) {
      setSupported(false);
      return;
    }

    const detector = canUseNative
      ? new BarcodeDetectorCtor!({
          formats: [
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "qr_code",
            "itf",
          ],
        })
      : null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let cancelled = false;
    let lastScanAt = 0;
    let attempts = 0;
    let rafId = 0;

    const acceptValue = (raw: string) => {
      const value = raw.trim();
      if (!value) return false;
      if (scanMode === "qr") return looksLikeQr(value) || value.length > 8;
      if (scanMode === "barcode") return !looksLikeQr(value);
      return true;
    };

    const handleDetected = (value: string) => {
      if (detectedRef.current) return;
      detectedRef.current = true;
      stopCamera();
      onDetected(value);
    };

    const tick = async (now: number) => {
      if (cancelled || detectedRef.current) return;

      const video = videoRef.current;
      if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      attempts += 1;
      setScanStatus(attempts >= HOLD_STEADY_AFTER_ATTEMPTS ? "holdSteady" : "scanning");

      if (now - lastScanAt < SCAN_INTERVAL_MS) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastScanAt = now;

      if (detector) {
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue?.trim();
          if (value && acceptValue(value)) {
            handleDetected(value);
            return;
          }
        } catch {
          /* retry next frame */
        }
      }

      if (wantsQr && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        const value = qr?.data?.trim();
        if (value && acceptValue(value)) {
          handleDetected(value);
          return;
        }
      }

      if (!cancelled) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      setScanStatus("idle");
    };
  }, [active, disabled, onDetected, scanMode, stopCamera]);

  const statusMessage =
    scanStatus === "holdSteady"
      ? t("receipts.scanner.holdSteady")
      : scanStatus === "scanning"
        ? t("receipts.scanner.detecting")
        : null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden border border-black/10 bg-black/5 aspect-[4/3] relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-black/60">
            {autoStart ? t("checkIn.scanner.cameraStarting") : t("receipts.scanner.cameraHint")}
          </div>
        )}
        {active && statusMessage && (
          <div className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-sm text-center px-4 py-2">
            {statusMessage}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-amber-800">{error}</p>}

      {!hideControls && (
        <div className="flex gap-2">
          {!active ? (
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={() => void startCamera()}
              disabled={disabled}
            >
              {t("receipts.scanner.startCamera")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={stopCamera}
            >
              {t("receipts.scanner.stopCamera")}
            </button>
          )}
        </div>
      )}

      {!supported && (
        <p className="text-xs text-black/50">
          {t("receipts.scanner.unsupportedHint")}
        </p>
      )}
    </div>
  );
}

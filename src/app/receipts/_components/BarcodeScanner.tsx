"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/client";

type Props = {
  onDetected: (code: string) => void;
  disabled?: boolean;
  /** Start the camera immediately when mounted (no extra tap). */
  autoStart?: boolean;
  /** Hide start/stop controls — parent handles cancel. */
  hideControls?: boolean;
};

export function BarcodeScanner({
  onDetected,
  disabled,
  autoStart = false,
  hideControls = false,
}: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);
  const startGenerationRef = useRef(0);

  const stopCamera = useCallback(() => {
    startGenerationRef.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    const generation = ++startGenerationRef.current;
    setError("");
    detectedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
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
  }, [t]);

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

    if (!BarcodeDetectorCtor) {
      setSupported(false);
      return;
    }

    const detector = new BarcodeDetectorCtor({
      formats: [
        "code_128",
        "code_39",
        "ean_13",
        "ean_8",
        "qr_code",
        "itf",
      ],
    });

    let cancelled = false;
    const tick = async () => {
      if (cancelled || detectedRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const value = codes[0]?.rawValue?.trim();
        if (value) {
          detectedRef.current = true;
          stopCamera();
          onDetected(value);
          return;
        }
      } catch {
        /* scan frame retry */
      }
      if (!cancelled) requestAnimationFrame(tick);
    };

    const id = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [active, disabled, onDetected, stopCamera]);

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

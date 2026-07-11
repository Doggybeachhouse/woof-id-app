"use client";

import {
  BrowserMultiFormatOneDReader,
  BrowserMultiFormatReader,
} from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";
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

/** Throttle decode attempts — faster than per-frame on mobile CPUs. */
const SCAN_INTERVAL_MS = 140;
const HOLD_STEADY_AFTER_ATTEMPTS = 24;
const FEEDBACK_EVERY_ATTEMPTS = 6;
/** Cap ZXing input size for faster 1D decode on thermal receipts. */
const MAX_DECODE_WIDTH = 1280;

const RECEIPT_BARCODE_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.ITF,
  BarcodeFormat.EAN_13,
  BarcodeFormat.CODABAR,
  BarcodeFormat.CODE_39,
];

function createBarcodeHints(tryHarder: boolean) {
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, RECEIPT_BARCODE_FORMATS],
  ]);
  if (tryHarder) {
    hints.set(DecodeHintType.TRY_HARDER, true);
  }
  return hints;
}

type CropRegion = {
  label: string;
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
};

/** One region per scan tick — full frame plus bottom crops for thermal receipt codes. */
const RECEIPT_CROP_REGIONS: CropRegion[] = [
  { label: "full", xRatio: 0, yRatio: 0, wRatio: 1, hRatio: 1 },
  { label: "bottom-third", xRatio: 0, yRatio: 0.66, wRatio: 1, hRatio: 0.34 },
  { label: "bottom-tight", xRatio: 0.05, yRatio: 0.72, wRatio: 0.9, hRatio: 0.24 },
];

function looksLikeQr(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("http") ||
    trimmed.includes("/check-in") ||
    trimmed.startsWith("WOOF-")
  );
}

function isNotFoundError(error: unknown) {
  return (
    error instanceof NotFoundException ||
    (error instanceof Error && error.name === "NotFoundException")
  );
}

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function createReceiptBarcodeReader(tryHarder: boolean) {
  return new BrowserMultiFormatOneDReader(createBarcodeHints(tryHarder));
}

function regionPixels(
  width: number,
  height: number,
  region: CropRegion,
): { x: number; y: number; w: number; h: number } {
  const x = Math.max(0, Math.floor(width * region.xRatio));
  const y = Math.max(0, Math.floor(height * region.yRatio));
  const w = Math.max(1, Math.min(width - x, Math.floor(width * region.wRatio)));
  const h = Math.max(1, Math.min(height - y, Math.floor(height * region.hRatio)));
  return { x, y, w, h };
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
  const [scanAttempts, setScanAttempts] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);
  const startGenerationRef = useRef(0);

  const stopCamera = useCallback(() => {
    startGenerationRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
    setScanStatus("idle");
    setScanAttempts(0);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    const generation = ++startGenerationRef.current;
    setError("");
    detectedRef.current = false;
    setScanStatus("idle");
    setScanAttempts(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        getCameraVideoConstraints(facingMode, {
          // Moderate resolution — enough for Code128 without heavy per-frame decode.
          highResolution: scanMode === "barcode",
        }),
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
  }, [facingMode, scanMode, t]);

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
    const onIOS = isIOSDevice();
    const canUseNative = Boolean(BarcodeDetectorCtor) && wantsBarcode;
    // iOS thermal receipts need ZXing with TRY_HARDER; native is tried first when available.
    const zxingReader = wantsBarcode
      ? scanMode === "barcode"
        ? createReceiptBarcodeReader(onIOS)
        : new BrowserMultiFormatReader(createBarcodeHints(false))
      : null;

    if (!canUseNative && !wantsQr && !zxingReader) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const detector = canUseNative
      ? new BarcodeDetectorCtor!({
          formats: [
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "qr_code",
            "itf",
            "codabar",
          ],
        })
      : null;

    const canvas = document.createElement("canvas");
    const cropCanvas = document.createElement("canvas");
    const decodeCanvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
    const decodeCtx = decodeCanvas.getContext("2d", { willReadFrequently: true });

    let cancelled = false;
    let lastScanAt = 0;
    let attempts = 0;
    let regionIndex = 0;
    let rafId = 0;
    let decodeInFlight = false;

    const acceptValue = (raw: string) => {
      const value = raw.trim();
      if (!value) return false;
      if (scanMode === "qr") return looksLikeQr(value) || value.length > 8;
      if (scanMode === "barcode") return !looksLikeQr(value);
      return true;
    };

    const handleDetected = (value: string, source: "native" | "zxing" | "jsqr") => {
      if (detectedRef.current) return;
      detectedRef.current = true;
      console.info("[barcode-scanner] detected", {
        source,
        scanMode,
        length: value.length,
        preview: value.slice(0, 24),
      });
      stopCamera();
      onDetected(value);
    };

    const decodeZxingValue = (source: HTMLVideoElement | HTMLCanvasElement): string | null => {
      if (!zxingReader) return null;

      try {
        const result =
          source instanceof HTMLVideoElement
            ? zxingReader.decode(source)
            : zxingReader.decodeFromCanvas(source);
        const value = result.getText()?.trim();
        if (value && acceptValue(value)) {
          return value;
        }
      } catch (error) {
        if (!isNotFoundError(error)) {
          /* retry next tick */
        }
      }

      return null;
    };

    const decodeZxingRegion = (region: CropRegion): string | null => {
      if (!zxingReader || !ctx || !cropCtx || !decodeCtx) return null;

      const video = videoRef.current;
      if (!video) return null;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const { x, y, w, h } = regionPixels(canvas.width, canvas.height, region);
      cropCanvas.width = w;
      cropCanvas.height = h;
      cropCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

      const scale =
        w > MAX_DECODE_WIDTH
          ? MAX_DECODE_WIDTH / w
          : w < 640
            ? Math.min(2, 640 / w)
            : 1;
      const decodeW = Math.max(1, Math.round(w * scale));
      const decodeH = Math.max(1, Math.round(h * scale));
      decodeCanvas.width = decodeW;
      decodeCanvas.height = decodeH;
      decodeCtx.drawImage(cropCanvas, 0, 0, decodeW, decodeH);

      return decodeZxingValue(decodeCanvas);
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
      if (attempts % FEEDBACK_EVERY_ATTEMPTS === 0) {
        setScanAttempts(attempts);
      }
      setScanStatus(attempts >= HOLD_STEADY_AFTER_ATTEMPTS ? "holdSteady" : "scanning");

      if (now - lastScanAt < SCAN_INTERVAL_MS || decodeInFlight) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastScanAt = now;

      if (detector) {
        decodeInFlight = true;
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue?.trim();
          if (value && acceptValue(value)) {
            handleDetected(value, "native");
            return;
          }
        } catch {
          /* retry next interval */
        } finally {
          decodeInFlight = false;
        }
      }

      if (zxingReader && video) {
        const region =
          scanMode === "barcode"
            ? RECEIPT_CROP_REGIONS[regionIndex % RECEIPT_CROP_REGIONS.length]!
            : { label: "full", xRatio: 0, yRatio: 0, wRatio: 1, hRatio: 1 };
        regionIndex += 1;

        let value: string | null = null;
        if (scanMode === "barcode" && onIOS && region.label === "full") {
          value = decodeZxingValue(video);
        }
        if (!value) {
          value = decodeZxingRegion(region);
        }
        if (value) {
          handleDetected(value, "zxing");
          return;
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
          handleDetected(value, "jsqr");
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
      setScanAttempts(0);
    };
  }, [active, disabled, onDetected, scanMode, stopCamera]);

  const statusMessage =
    scanStatus === "holdSteady"
      ? scanMode === "barcode"
        ? t("receipts.scanner.holdSteadyBarcode")
        : t("receipts.scanner.holdSteady")
      : scanStatus === "scanning"
        ? scanMode === "barcode"
          ? scanAttempts > 0
            ? t("receipts.scanner.detectingBarcodeProgress", { count: scanAttempts })
            : t("receipts.scanner.detectingBarcode")
          : t("receipts.scanner.detecting")
        : null;

  const isBarcodeMode = scanMode === "barcode";

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
        {active && isBarcodeMode && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-0 top-0 bottom-[34%] bg-black/35" />
            <div className="absolute inset-x-5 bottom-[10%] h-[18%] min-h-16 border-2 border-white/85 rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.2)]">
              <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-0.5 bg-red-400/90 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
            </div>
            <p className="absolute bottom-2 inset-x-0 text-center text-white text-xs font-medium px-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {t("receipts.scanner.alignBarcodeBottom")}
            </p>
          </div>
        )}
        {active && statusMessage && (
          <div className="absolute top-0 inset-x-0 bg-black/55 text-white text-sm text-center px-4 py-2">
            {statusMessage}
          </div>
        )}
      </div>

      {error && (
        <div className="space-y-1">
          <p className="text-sm text-amber-800">{error}</p>
          {isBarcodeMode && (
            <p className="text-xs text-black/55">{t("receipts.scanner.alignBarcodeBottom")}</p>
          )}
        </div>
      )}

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

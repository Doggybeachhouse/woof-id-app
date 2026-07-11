"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

import { useI18n } from "@/i18n/client";

type VoucherCodesProps = {
  code: string;
  rewardTitle: string;
  compact?: boolean;
};

function VoucherBarcode({ code, compact }: { code: string; compact?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, code, {
      format: "CODE128",
      displayValue: true,
      fontSize: compact ? 12 : 16,
      height: compact ? 80 : 96,
      margin: 10,
      lineColor: "#111111",
      background: "#ffffff",
    });
  }, [code, compact]);

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={code}
      className={`w-full mx-auto ${compact ? "max-w-xs" : "max-w-md"}`}
    />
  );
}

function VoucherQr({ code, compact }: { code: string; compact?: boolean }) {
  const [dataUrl, setDataUrl] = useState("");
  const { t } = useI18n();
  const size = compact ? 220 : 280;

  useEffect(() => {
    void QRCode.toDataURL(code, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#2c2824", light: "#ffffff" },
    }).then(setDataUrl);
  }, [code, size]);

  if (!dataUrl) return null;

  return (
    <Image
      src={dataUrl}
      alt={t("rewards.redeem.qrAlt")}
      width={size}
      height={size}
      unoptimized
      className={`mx-auto rounded-xl bg-white ${compact ? "w-52 h-52" : "w-64 h-64 sm:w-72 sm:h-72"}`}
    />
  );
}

export function VoucherCodes({ code, rewardTitle, compact }: VoucherCodesProps) {
  const { t } = useI18n();

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-black/10 p-3 space-y-3">
          <VoucherQr code={code} compact />
          <VoucherBarcode code={code} compact />
        </div>
        <p className="text-xs text-center font-mono tracking-wide text-[var(--foreground-muted)]">
          {code}
        </p>
        <p className="text-xs text-center text-[var(--foreground-muted)]">
          {t("rewards.redeem.scanAtKassa")}
        </p>
      </div>
    );
  }

  return (
    <div className="voucher-card">
      <p className="text-xs font-bold uppercase tracking-widest text-[#ff416e]">
        {t("rewards.redeem.brand")}
      </p>
      <h3 className="font-display text-2xl mt-2">{rewardTitle}</h3>
      <p className="text-sm text-black/60 mt-1">{t("rewards.redeem.voucherSubtitle")}</p>
      <div className="mt-5 bg-white rounded-xl border border-black/10 p-4 sm:p-5 space-y-4">
        <VoucherQr code={code} />
        <VoucherBarcode code={code} />
      </div>
      <p className="text-sm text-black/55 mt-3 font-mono tracking-wide text-center">{code}</p>
      <p className="text-xs text-black/50 mt-3 text-center">{t("rewards.redeem.scanAtKassa")}</p>
    </div>
  );
}

"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useRef, useState, useTransition } from "react";
import JsBarcode from "jsbarcode";

import { redeemRewardAction } from "@/app/rewards/actions";
import { useI18n } from "@/i18n/client";
import type { WoofReward } from "@/lib/gamification/rewards";

type RewardRedeemButtonProps = {
  dogId: string;
  reward: WoofReward;
};

type VoucherState = {
  code: string;
  rewardTitle: string;
  newBalance: number;
};

function VoucherBarcode({ code }: { code: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, code, {
      format: "CODE128",
      displayValue: true,
      fontSize: 14,
      height: 72,
      margin: 8,
      lineColor: "#111111",
    });
  }, [code]);

  return <svg ref={svgRef} className="w-full max-w-sm mx-auto" />;
}

function VoucherQr({ code }: { code: string }) {
  const [dataUrl, setDataUrl] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    void QRCode.toDataURL(code, {
      width: 240,
      margin: 2,
      color: { dark: "#2c2824", light: "#ffffff" },
    }).then(setDataUrl);
  }, [code]);

  if (!dataUrl) return null;

  return (
    <Image
      src={dataUrl}
      alt={t("rewards.redeem.qrAlt")}
      width={240}
      height={240}
      unoptimized
      className="w-48 h-48 mx-auto rounded-xl"
    />
  );
}

export function RewardRedeemButton({ dogId, reward }: RewardRedeemButtonProps) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [voucher, setVoucher] = useState<VoucherState | null>(null);
  const [revealed, setRevealed] = useState(false);

  function handleRedeem() {
    setError("");
    startTransition(async () => {
      const result = await redeemRewardAction(dogId, reward.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setVoucher({
        code: result.code,
        rewardTitle: result.rewardTitle,
        newBalance: result.newBalance,
      });
      requestAnimationFrame(() => setRevealed(true));
    });
  }

  if (voucher) {
    return (
      <div
        className={`voucher-reveal ${revealed ? "voucher-reveal--active" : ""}`}
      >
        <div className="voucher-card">
          <p className="text-xs font-bold uppercase tracking-widest text-[#ff416e]">
            {t("rewards.redeem.brand")}
          </p>
          <h3 className="font-display text-2xl mt-2">{voucher.rewardTitle}</h3>
          <p className="text-sm text-black/60 mt-1">
            {t("rewards.redeem.voucherSubtitle")}
          </p>
          <div className="mt-5 bg-white rounded-xl border border-black/10 p-4 space-y-4">
            <VoucherQr code={voucher.code} />
            <VoucherBarcode code={voucher.code} />
          </div>
          <p className="text-xs text-black/45 mt-3 font-mono">{voucher.code}</p>
          <p className="text-sm mt-4">
            {t("rewards.redeem.newBalance")}{" "}
            <strong className="coin-badge inline-flex">🪙 {voucher.newBalance}</strong>
          </p>
          <p className="text-xs text-black/50 mt-3">
            {t("rewards.redeem.scanAtCounter")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-primary w-full sm:w-auto"
        onClick={handleRedeem}
        disabled={pending}
      >
        {pending ? t("rewards.redeem.submitLoading") : t("rewards.redeem.submit")}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

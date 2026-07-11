"use client";

import { useState, useTransition } from "react";

import { redeemRewardAction } from "@/app/rewards/actions";
import { VoucherCodes } from "@/app/rewards/_components/VoucherCodes";
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
        <VoucherCodes code={voucher.code} rewardTitle={voucher.rewardTitle} />
        <p className="text-sm mt-4">
          {t("rewards.redeem.newBalance")}{" "}
          <strong className="coin-badge inline-flex">🪙 {voucher.newBalance}</strong>
        </p>
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

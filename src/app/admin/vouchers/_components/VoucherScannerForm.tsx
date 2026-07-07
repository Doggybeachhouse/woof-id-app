"use client";

import { useActionState } from "react";

import { redeemVoucherByCodeAction } from "@/app/admin/vouchers/actions";
import { useI18n } from "@/i18n/client";

const initialState = {
  ok: false,
  error: "",
  success: "",
  voucher: null as null | {
    code: string;
    rewardTitle: string;
    dogName: string;
    woofId?: string;
    ownerEmail?: string;
    coinsSpent?: number;
  },
};

export function VoucherScannerForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const code = String(formData.get("code") ?? "");
      const result = await redeemVoucherByCodeAction(code);

      if (!result.ok) {
        return {
          ok: false,
          error: result.error,
          success: "",
          voucher: result.voucher ?? null,
        };
      }

      return {
        ok: true,
        error: "",
        success: t("admin.vouchers.redeemedSuccess", {
          rewardTitle: result.voucher.rewardTitle,
          dogName: result.voucher.dogName,
        }),
        voucher: result.voucher,
      };
    },
    initialState,
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="code">
            {t("admin.vouchers.codeLabel")}
          </label>
          <input
            id="code"
            name="code"
            className="input font-mono uppercase"
            placeholder={t("admin.vouchers.codePlaceholder")}
            autoComplete="off"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? t("admin.vouchers.submitLoading") : t("admin.vouchers.submit")}
        </button>
      </form>

      {state.error && (
        <div className="card p-4 border-red-200 bg-red-50 text-sm text-red-700">
          {state.error}
          {state.voucher && (
            <p className="mt-2 text-black/70">
              {state.voucher.rewardTitle} — {state.voucher.dogName}
            </p>
          )}
        </div>
      )}

      {state.success && (
        <div className="card p-4 border-green-200 bg-green-50 text-sm text-green-800 space-y-1">
          <p className="font-semibold">{state.success}</p>
          {state.voucher && (
            <>
              <p>{t("admin.vouchers.woofId", { woofId: state.voucher.woofId ?? "" })}</p>
              <p>{t("admin.vouchers.owner", { ownerEmail: state.voucher.ownerEmail ?? "" })}</p>
              <p className="font-mono text-xs">{state.voucher.code}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

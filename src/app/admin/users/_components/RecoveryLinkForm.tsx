"use client";

import { useActionState } from "react";

import { sendRecoveryEmailAction } from "@/app/admin/users/actions";
import { useI18n } from "@/i18n/client";

const initialState = {
  error: "",
  success: false,
  email: "",
  mode: "",
};

export function RecoveryLinkForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await sendRecoveryEmailAction(formData);
      if (result.errorCode) {
        return {
          error: t(`admin.users.errors.${result.errorCode}`),
          success: false,
          email: "",
          mode: "",
        };
      }
      return {
        error: "",
        success: true,
        email: result.email ?? "",
        mode: result.mode ?? "",
      };
    },
    initialState,
  );

  const modeLabel =
    state.mode === "magic"
      ? t("admin.users.modeMagic")
      : t("admin.users.modeReset");

  return (
    <div className="space-y-4">
      <form action={formAction} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            {t("admin.users.emailLabel")}
          </label>
          <input id="email" name="email" type="email" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="mode">
            {t("admin.users.modeLabel")}
          </label>
          <select id="mode" name="mode" className="input">
            <option value="reset">{t("admin.users.modeReset")}</option>
            <option value="magic">{t("admin.users.modeMagic")}</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? t("admin.users.submitLoading") : t("admin.users.submit")}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {state.success && (
        <div className="card p-4 bg-[#e8f5e9] text-sm space-y-2">
          <p className="font-semibold">
            {t("admin.users.emailSent", {
              email: state.email,
              mode: modeLabel,
            })}
          </p>
          <p className="text-black/55 text-xs">{t("admin.users.emailSentHint")}</p>
        </div>
      )}
    </div>
  );
}

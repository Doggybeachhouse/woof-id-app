"use client";

import { useActionState } from "react";

import {
  changeEmailAction,
  changePasswordAction,
} from "@/app/account/actions";
import { useI18n } from "@/i18n/client";

const initialState = { error: "", success: "" };

export function AccountSettingsForms({ email }: { email: string }) {
  const { t } = useI18n();
  const [passwordState, passwordAction, passwordPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await changePasswordAction(formData);
      return {
        error: result.error ?? "",
        success: result.success ?? "",
      };
    },
    initialState,
  );

  const [emailState, emailAction, emailPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await changeEmailAction(formData);
      return {
        error: result.error ?? "",
        success: result.success ?? "",
      };
    },
    initialState,
  );

  return (
    <div className="space-y-6">
      <section className="card p-6 space-y-4">
        <h2 className="font-display text-xl">{t("account.changePassword.title")}</h2>
        <form action={passwordAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="currentPassword">
              {t("account.changePassword.currentPasswordLabel")}
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">
              {t("account.changePassword.newPasswordLabel")}
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              className="input"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              {t("account.changePassword.confirmPasswordLabel")}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="input"
              minLength={8}
              required
            />
          </div>
          {passwordState.error && (
            <p className="text-sm text-red-600">{passwordState.error}</p>
          )}
          {passwordState.success && (
            <p className="text-sm text-green-700">{passwordState.success}</p>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={passwordPending}
          >
            {passwordPending ? t("account.changePassword.submitLoading") : t("account.changePassword.submit")}
          </button>
        </form>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-display text-xl">{t("account.changeEmail.title")}</h2>
        <p className="text-sm text-black/60">
          {t("account.changeEmail.currentEmail", { email })}
        </p>
        <form action={emailAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="newEmail">
              {t("account.changeEmail.newEmailLabel")}
            </label>
            <input
              id="newEmail"
              name="newEmail"
              type="email"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              {t("account.changeEmail.passwordLabel")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              required
            />
          </div>
          {emailState.error && (
            <p className="text-sm text-red-600">{emailState.error}</p>
          )}
          {emailState.success && (
            <p className="text-sm text-green-700">{emailState.success}</p>
          )}
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={emailPending}
          >
            {emailPending ? t("account.changeEmail.submitLoading") : t("account.changeEmail.submit")}
          </button>
        </form>
      </section>
    </div>
  );
}

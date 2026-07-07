"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useState } from "react";

import { loginAction } from "@/app/login/actions";
import { DbhLogo } from "@/app/_components/DbhLogo";
import { useI18n } from "@/i18n/client";

type Props = {
  callbackUrl: string;
  errorCode?: string | null;
  staffRequired?: boolean;
  resetDone?: boolean;
};

function mapAuthError(
  errorCode: string | null | undefined,
  staffRequired: boolean,
  t: (key: string) => string,
): string {
  if (staffRequired || errorCode === "staff_required") {
    return t("errors.login.staffRequired");
  }
  if (errorCode === "CredentialsSignin") return t("errors.login.invalidCredentials");
  if (errorCode) return t("errors.login.invalidCredentials");
  return "";
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? t("auth.login.submitLoading") : t("auth.login.submit")}
    </button>
  );
}

export function LoginForm({
  callbackUrl,
  errorCode,
  staffRequired = false,
  resetDone = false,
}: Props) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const error = mapAuthError(errorCode, staffRequired, t);

  return (
    <div className="hero-card p-6 sm:p-7 max-w-md mx-auto space-y-5">
      <div className="text-center space-y-3">
        <DbhLogo className="mx-auto h-40 w-40" href={null} />
        <h1 className="font-display text-3xl">{t("auth.login.title")}</h1>
        <p className="text-sm text-black/60">{t("auth.login.subtitle")}</p>
      </div>

      {resetDone && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          {t("auth.login.resetSuccess")}
        </p>
      )}

      <form action={loginAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div>
          <label className="label" htmlFor="email">
            {t("auth.login.emailLabel")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            {t("auth.login.passwordLabel")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton />
      </form>

      <div className="text-sm text-center space-y-2">
        <p>
          <Link href="/forgot-password" className="font-semibold underline">
            {t("auth.login.forgotPassword")}
          </Link>
        </p>
        <p className="text-black/60">
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className="font-semibold underline">
            {t("auth.login.registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

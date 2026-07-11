"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { useI18n } from "@/i18n/client";

type EmailCheck = {
  available: boolean;
  code?: string;
  message?: string;
  canLink?: boolean;
};

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [emailCheck, setEmailCheck] = useState<EmailCheck | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  async function validateEmail(value: string) {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setEmailCheck(null);
      return;
    }

    setCheckingEmail(true);
    const res = await fetch("/api/register/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    setCheckingEmail(false);

    if (!res.ok) {
      setEmailCheck(null);
      return;
    }

    setEmailCheck(data as EmailCheck);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrorCode("");

    if (!emailCheck || !emailCheck.available) {
      await validateEmail(email);
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t("errors.register.failed"));
      setErrorCode(data.code ?? "");
      if (data.code === "email_in_use_woof_id" || data.code === "email_in_use_webshop") {
        setEmailCheck({
          available: false,
          code: data.code,
          message: data.error,
          canLink: data.code === "email_in_use_webshop",
        });
      }
      return;
    }

    router.push("/login");
  }

  const showWoofIdExists =
    emailCheck?.code === "email_in_use_woof_id" || errorCode === "email_in_use_woof_id";
  const showWebshopHint =
    emailCheck?.code === "email_in_use_webshop" && !showWoofIdExists;

  return (
    <div className="hero-card p-6 sm:p-7 max-w-md mx-auto space-y-5">
      <div className="text-center space-y-3">
        <DbhLogo className="mx-auto h-32 w-32" />
        <h1 className="font-display text-3xl">{t("auth.register.title")}</h1>
      </div>
      <p className="text-sm text-[var(--foreground-muted)] text-center">
        {t("auth.register.intro")}
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">
            {t("auth.register.nameLabel")}
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            {t("auth.register.emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailCheck(null);
              setError("");
              setErrorCode("");
            }}
            onBlur={(e) => void validateEmail(e.target.value)}
            required
          />
          {checkingEmail && (
            <p className="text-xs text-[var(--foreground-muted)] mt-2">{t("auth.register.emailChecking")}</p>
          )}
          {showWoofIdExists && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              <p>
                {emailCheck?.message ??
                  t("auth.register.emailInUseWoofId")}
              </p>
              <p className="mt-2">
                <Link href="/login" className="font-semibold text-[var(--accent-primary)] hover:underline">
                  {t("auth.register.goToLogin")}
                </Link>
              </p>
            </div>
          )}
          {showWebshopHint && (
            <div className="mt-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p>{emailCheck?.message}</p>
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="password">
            {t("auth.register.passwordLabel")}
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error && !showWoofIdExists && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading || showWoofIdExists || checkingEmail}
        >
          {loading ? t("auth.register.submitLoading") : t("auth.register.submit")}
        </button>
      </form>
      <p className="text-sm text-[var(--foreground-muted)] text-center">
        {t("auth.register.hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-[var(--accent-primary)] hover:underline">
          {t("auth.register.loginLink")}
        </Link>
      </p>
    </div>
  );
}

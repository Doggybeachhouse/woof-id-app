"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { useI18n } from "@/i18n/client";

function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => setValid(Boolean(data.valid)))
      .catch(() => setValid(false));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("errors.resetPassword.passwordMismatch"));
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("errors.resetPassword.failed"));
      return;
    }

    router.push("/login?reset=1");
  }

  if (valid === null) {
    return <p className="text-sm text-black/60">{t("auth.resetPassword.checkingLink")}</p>;
  }

  if (!valid) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-red-600">
          {t("auth.resetPassword.invalidLink")}
        </p>
        <Link href="/forgot-password" className="btn btn-primary">
          {t("auth.resetPassword.requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          {t("auth.resetPassword.newPasswordLabel")}
        </label>
        <input
          id="password"
          type="password"
          className="input"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          {t("auth.resetPassword.confirmPasswordLabel")}
        </label>
        <input
          id="confirm"
          type="password"
          className="input"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? t("auth.resetPassword.submitLoading") : t("auth.resetPassword.submit")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className="hero-card p-6 sm:p-7 max-w-md mx-auto space-y-5">
      <div className="text-center space-y-3">
        <DbhLogo className="mx-auto h-40 w-40" href={null} />
        <h1 className="font-display text-3xl">{t("auth.resetPassword.title")}</h1>
      </div>
      <Suspense fallback={<p className="text-sm text-black/60">{t("auth.resetPassword.loading")}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

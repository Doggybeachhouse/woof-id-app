"use client";

import Link from "next/link";
import { useState } from "react";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { useI18n } from "@/i18n/client";

type Mode = "reset" | "magic";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("reset");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [staffLink, setStaffLink] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setStaffLink("");

    const res = await fetch("/api/auth/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mode }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message ?? t("errors.forgotPassword.defaultSuccess"));
    if (data.staffLink) setStaffLink(data.staffLink);
  }

  return (
    <div className="hero-card p-6 sm:p-7 max-w-md mx-auto space-y-5">
      <div className="text-center space-y-3">
        <DbhLogo className="mx-auto h-40 w-40" href={null} />
        <h1 className="font-display text-3xl">{t("auth.forgotPassword.title")}</h1>
        <p className="text-sm text-black/60">
          {t("auth.forgotPassword.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`btn text-sm ${mode === "reset" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setMode("reset")}
        >
          {t("auth.forgotPassword.modeReset")}
        </button>
        <button
          type="button"
          className={`btn text-sm ${mode === "magic" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setMode("magic")}
        >
          {t("auth.forgotPassword.modeMagic")}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            {t("auth.forgotPassword.emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading
            ? t("auth.forgotPassword.submitLoading")
            : mode === "magic"
              ? t("auth.forgotPassword.submitMagic")
              : t("auth.forgotPassword.submitReset")}
        </button>
      </form>

      {message && <p className="text-sm text-black/70">{message}</p>}

      {staffLink && (
        <div className="rounded-lg bg-[#fff8e0] border border-[#ffde5b]/50 p-3 text-xs space-y-2">
          <p className="font-semibold">{t("auth.forgotPassword.staffLinkTitle")}</p>
          <code className="block break-all">{staffLink}</code>
          <p className="text-black/55">
            {t("auth.forgotPassword.staffLinkHint")}
          </p>
        </div>
      )}

      <p className="text-sm text-black/60 text-center">
        <Link href="/login" className="underline font-semibold">
          {t("auth.forgotPassword.backToLogin")}
        </Link>
      </p>
    </div>
  );
}

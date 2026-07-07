"use client";

import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { useI18n } from "@/i18n/client";

function MagicLoginHandler() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError(t("errors.magicLogin.noToken"));
      return;
    }

    async function login() {
      const res = await fetch("/api/auth/magic-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.email) {
        setError(data.error ?? t("errors.magicLogin.invalidOrExpired"));
        return;
      }

      const signInRes = await signIn("credentials", {
        email: data.email,
        magicToken: token,
        redirect: false,
      });

      if (signInRes?.error) {
        setError(t("errors.magicLogin.failed"));
        return;
      }

      for (let i = 0; i < 10; i += 1) {
        const session = await getSession();
        if (session?.user) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      window.location.assign("/");
    }

    void login();
  }, [token]);

  if (error) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/forgot-password" className="btn btn-primary">
          {t("auth.magicLogin.requestNewLink")}
        </Link>
      </div>
    );
  }

  return <p className="text-sm text-black/60 text-center">{t("auth.magicLogin.loggingIn")}</p>;
}

export default function MagicLoginPage() {
  const { t } = useI18n();
  return (
    <div className="hero-card p-6 sm:p-7 max-w-md mx-auto space-y-5">
      <div className="text-center space-y-3">
        <DbhLogo className="mx-auto h-40 w-40" href={null} />
        <h1 className="font-display text-3xl">{t("auth.magicLogin.title")}</h1>
      </div>
      <Suspense fallback={<p className="text-sm text-black/60">{t("auth.magicLogin.loading")}</p>}>
        <MagicLoginHandler />
      </Suspense>
    </div>
  );
}

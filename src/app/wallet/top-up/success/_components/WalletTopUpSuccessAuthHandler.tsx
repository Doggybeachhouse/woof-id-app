"use client";

import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";

export function WalletTopUpSuccessAuthHandler({ token }: { token: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function login() {
      const res = await fetch("/api/auth/topup-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.email) {
        setError(data.error ?? t("wallet.topUp.returnLinkInvalid"));
        return;
      }

      const signInRes = await signIn("credentials", {
        email: data.email,
        topupReturnToken: token,
        redirect: false,
      });

      if (signInRes?.error) {
        setError(t("wallet.topUp.returnLoginFailed"));
        return;
      }

      for (let i = 0; i < 10; i += 1) {
        const session = await getSession();
        if (session?.user) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      router.replace("/wallet/top-up/success");
    }

    void login();
  }, [router, t, token]);

  if (error) {
    return (
      <div className="card-luxe p-8 max-w-lg mx-auto text-center space-y-4">
        <h1 className="font-display text-2xl">{t("wallet.topUp.successTitle")}</h1>
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-sm text-[var(--foreground-muted)]">
          {t("wallet.topUp.returnLinkHelp")}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Link href="/login?callbackUrl=%2Fwallet%2Ftop-up%2Fsuccess" className="btn btn-primary">
            {t("auth.login.title")}
          </Link>
          <Link href="/wallet/top-up" className="text-sm underline text-black/60">
            {t("wallet.topUp.title")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-luxe p-8 max-w-lg mx-auto text-center">
      <p className="text-sm text-black/60">{t("wallet.topUp.returnLoggingIn")}</p>
    </div>
  );
}

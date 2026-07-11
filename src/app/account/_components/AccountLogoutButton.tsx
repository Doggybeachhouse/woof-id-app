"use client";

import { signOut } from "next-auth/react";

import { useI18n } from "@/i18n/client";

export function AccountLogoutButton() {
  const { t } = useI18n();

  return (
    <button
      type="button"
      className="btn btn-secondary w-full"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      {t("nav.logout.label")}
    </button>
  );
}

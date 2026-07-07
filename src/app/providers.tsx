"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/translate";

export function Providers({
  children,
  locale,
  messages,
  session,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus>
      <I18nProvider locale={locale} messages={messages}>
        {children}
      </I18nProvider>
    </SessionProvider>
  );
}

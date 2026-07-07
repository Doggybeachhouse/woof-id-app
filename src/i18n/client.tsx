"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  defaultLocale,
  isLocale,
  localeCookie,
  type Locale,
} from "@/i18n/config";
import de from "@/i18n/messages/de.json";
import en from "@/i18n/messages/en.json";
import nl from "@/i18n/messages/nl.json";
import { createTranslator, type Messages, type Translator } from "@/i18n/translate";

const clientMessages: Record<Locale, Messages> = { nl, de, en };

type I18nContextValue = {
  locale: Locale;
  t: Translator;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookie}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

export function I18nProvider({
  locale: serverLocale,
  messages: serverMessages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [locale, setLocaleState] = useState<Locale>(serverLocale);

  useEffect(() => {
    setLocaleState(serverLocale);
  }, [serverLocale]);

  const messages = clientMessages[locale] ?? serverMessages;
  const t = useMemo(() => createTranslator(messages), [messages]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      if (!isLocale(nextLocale) || nextLocale === locale) return;
      writeLocaleCookie(nextLocale);
      setLocaleState(nextLocale);
      startTransition(() => {
        router.refresh();
      });
    },
    [locale, router],
  );

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: defaultLocale,
      t: createTranslator(clientMessages[defaultLocale]),
      setLocale: () => {},
    };
  }
  return ctx;
}

export { writeLocaleCookie };

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  defaultLocale,
  isLocale,
  type Locale,
} from "@/i18n/config";
import de from "@/i18n/messages/de.json";
import en from "@/i18n/messages/en.json";
import nl from "@/i18n/messages/nl.json";
import {
  persistLocale,
  persistLocaleOnServer,
  readStoredLocale,
} from "@/i18n/storage";
import { createTranslator, type Messages, type Translator } from "@/i18n/translate";

const clientMessages: Record<Locale, Messages> = { nl, de, en };

type I18nContextValue = {
  locale: Locale;
  t: Translator;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

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
  const pendingLocaleRef = useRef<Locale | null>(null);
  const [locale, setLocaleState] = useState<Locale>(serverLocale);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored && stored !== serverLocale) {
      pendingLocaleRef.current = stored;
      persistLocale(stored);
      setLocaleState(stored);
      persistLocaleOnServer(stored);
      startTransition(() => {
        router.refresh();
      });
    }
    // Restore persisted preference once on mount when SSR missed the cookie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingLocaleRef.current !== null) {
      if (serverLocale === pendingLocaleRef.current) {
        pendingLocaleRef.current = null;
      }
      return;
    }
    setLocaleState(serverLocale);
  }, [serverLocale]);

  const messages = clientMessages[locale] ?? serverMessages;
  const t = useMemo(() => createTranslator(messages), [messages]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      if (!isLocale(nextLocale) || nextLocale === locale) return;
      pendingLocaleRef.current = nextLocale;
      persistLocale(nextLocale);
      setLocaleState(nextLocale);
      persistLocaleOnServer(nextLocale);
      queueMicrotask(() => {
        startTransition(() => {
          router.refresh();
        });
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

export { writeLocaleCookie } from "@/i18n/storage";

import { cookies, headers } from "next/headers";

import {
  defaultLocale,
  isLocale,
  localeCookie,
  resolveLocale,
  type Locale,
} from "@/i18n/config";
import { createTranslator, type Messages, type Translator } from "@/i18n/translate";

import de from "@/i18n/messages/de.json";
import en from "@/i18n/messages/en.json";
import nl from "@/i18n/messages/nl.json";

const allMessages: Record<Locale, Messages> = { nl, de, en };

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return resolveLocale(
    cookieStore.get(localeCookie)?.value,
    headerStore.get("accept-language"),
  );
}

export async function getMessages(locale?: Locale): Promise<Messages> {
  const resolved = locale ?? (await getLocale());
  return allMessages[resolved] ?? allMessages[defaultLocale];
}

export async function getTranslations(locale?: Locale): Promise<{
  locale: Locale;
  t: Translator;
  messages: Messages;
}> {
  const resolved = locale ?? (await getLocale());
  const messages = allMessages[resolved] ?? allMessages[defaultLocale];
  return {
    locale: resolved,
    messages,
    t: createTranslator(messages),
  };
}

export function getTranslatorForLocale(locale: Locale): Translator {
  const messages = allMessages[isLocale(locale) ? locale : defaultLocale];
  return createTranslator(messages);
}

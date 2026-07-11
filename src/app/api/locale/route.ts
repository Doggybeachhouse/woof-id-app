import { NextResponse } from "next/server";

import {
  isLocale,
  localeCookie,
  localeCookieMaxAge,
  type Locale,
} from "@/i18n/config";

function safeReturnPath(value: string | null): string {
  if (!value) return "/";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(localeCookie, locale, {
    path: "/",
    maxAge: localeCookieMaxAge,
    sameSite: "lax",
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { locale?: string } | null;
  const locale = body?.locale;

  const response = NextResponse.json({ ok: true });
  if (isLocale(locale)) {
    setLocaleCookie(response, locale);
  }
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang");
  const returnTo = safeReturnPath(url.searchParams.get("returnTo"));

  const response = NextResponse.redirect(new URL(returnTo, url.origin));

  if (isLocale(lang)) {
    setLocaleCookie(response, lang as Locale);
  }

  return response;
}

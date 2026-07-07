import { NextResponse } from "next/server";

import { isLocale, localeCookie, type Locale } from "@/i18n/config";

function safeReturnPath(value: string | null): string {
  if (!value) return "/";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang");
  const returnTo = safeReturnPath(url.searchParams.get("returnTo"));

  const response = NextResponse.redirect(new URL(returnTo, url.origin));

  if (isLocale(lang)) {
    response.cookies.set(localeCookie, lang as Locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

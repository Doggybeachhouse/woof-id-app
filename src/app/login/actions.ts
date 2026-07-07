"use server";

import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isStaffRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

function getSafeCallbackUrl(raw: string): string {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

function loginFailed(callbackUrl: string): never {
  redirect(
    `/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`,
  );
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = getSafeCallbackUrl(String(formData.get("callbackUrl") ?? "/"));

  if (!email || !password) {
    loginFailed(callbackUrl);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    loginFailed(callbackUrl);
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    loginFailed(callbackUrl);
  }

  if (callbackUrl.startsWith("/admin") && !isStaffRole(user.role)) {
    redirect(
      `/login?error=staff_required&callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }

  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
  const sessionCookieName = useSecureCookies
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const sessionToken = await encode({
    token: {
      sub: user.id,
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name ?? undefined,
    },
    secret,
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecureCookies,
    maxAge: 30 * 24 * 60 * 60,
  });

  redirect(callbackUrl);
}

"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getTranslations } from "@/i18n/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";
import {
  syncWebshopEmail,
  syncWebshopPassword,
} from "@/lib/wordpress/accounts";

export async function changePasswordAction(formData: FormData) {
  const { t } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordSchema = z
    .string()
    .min(8, t("errors.account.passwordMinLength"))
    .max(128, t("errors.account.invalidPassword"));

  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? t("errors.account.invalidPassword"),
    };
  }

  if (newPassword !== confirmPassword) {
    return { error: t("errors.account.passwordMismatch") };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return { error: t("errors.account.accountNotFound") };
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return { error: t("errors.account.currentPasswordWrong") };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const synced = await syncWebshopPassword(user.email, newPassword);
  if (!synced.ok) {
    return { error: synced.error };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  revalidatePath("/account");
  return { success: t("errors.account.passwordUpdated") };
}

export async function changeEmailAction(formData: FormData) {
  const { t } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;

  const newEmail = String(formData.get("newEmail") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!newEmail.includes("@")) {
    return { error: t("errors.account.invalidEmail") };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return { error: t("errors.account.accountNotFound") };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: t("errors.account.passwordWrong") };
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) {
    return { error: t("errors.account.emailInUse") };
  }

  const synced = await syncWebshopEmail(user.email, newEmail, password);
  if (!synced.ok) {
    return { error: synced.error };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail },
  });

  revalidatePath("/account");
  return { success: t("errors.account.emailUpdated") };
}

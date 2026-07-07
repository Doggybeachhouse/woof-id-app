import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

export async function verifyUserPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function createBridgeUser(input: {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || undefined,
      role: input.role ?? "OWNER",
    },
  });
}

export async function updateBridgePassword(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.update({
    where: { email: email.trim().toLowerCase() },
    data: { passwordHash },
  });
}

export async function updateBridgeEmail(oldEmail: string, newEmail: string) {
  return prisma.user.update({
    where: { email: oldEmail.trim().toLowerCase() },
    data: { email: newEmail.trim().toLowerCase() },
  });
}

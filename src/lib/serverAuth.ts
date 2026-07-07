import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireStaff() {
  const session = await requireUser();
  const role = (session.user as { role?: UserRole }).role;
  if (role !== "STAFF" && role !== "ADMIN") redirect("/");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if ((session.user as { role?: UserRole }).role !== "ADMIN") redirect("/");
  return session;
}

export function isStaffRole(role?: string) {
  return role === "STAFF" || role === "ADMIN";
}

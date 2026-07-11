export function getPushAdminSecret(): string {
  return process.env.WOOF_PUSH_ADMIN_SECRET?.trim() ?? "";
}

export function isPushAdminApiEnabled(): boolean {
  return getPushAdminSecret() !== "";
}

export function verifyPushAdminSecret(req: Request): boolean {
  const secret = getPushAdminSecret();
  if (!secret) {
    return false;
  }

  const header = req.headers.get("x-woof-push-secret")?.trim();
  return header === secret;
}

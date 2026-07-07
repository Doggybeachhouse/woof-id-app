import { getWordPressApiSecret } from "@/lib/wordpress/client";

export function verifyBridgeSecret(req: Request): boolean {
  const expected = getWordPressApiSecret();
  if (!expected) return false;

  const provided = req.headers.get("x-woof-id-secret")?.trim() ?? "";
  if (!provided) return false;

  return provided === expected;
}

export function bridgeUnauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

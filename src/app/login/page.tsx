import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/_components/LoginForm";
import { getSession, isStaffRole } from "@/lib/serverAuth";

function getSafeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    reset?: string;
  }>;
}) {
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (session?.user) {
    if (callbackUrl.startsWith("/admin") && !isStaffRole(role)) {
      return (
        <LoginForm
          callbackUrl={callbackUrl}
          staffRequired
          resetDone={params.reset === "1"}
        />
      );
    }
    redirect(callbackUrl);
  }

  return (
    <LoginForm
      callbackUrl={callbackUrl}
      errorCode={params.error}
      resetDone={params.reset === "1"}
    />
  );
}

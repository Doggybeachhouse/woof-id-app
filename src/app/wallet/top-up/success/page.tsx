import { WalletTopUpSuccessAuthHandler } from "@/app/wallet/top-up/success/_components/WalletTopUpSuccessAuthHandler";
import { WalletTopUpSuccessView } from "@/app/wallet/top-up/success/_components/WalletTopUpSuccessView";
import { getSession } from "@/lib/serverAuth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WalletTopUpSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();

  if (session?.user) {
    return <WalletTopUpSuccessView />;
  }

  const token = params.token?.trim();
  if (token) {
    return <WalletTopUpSuccessAuthHandler token={token} />;
  }

  redirect(
    `/login?callbackUrl=${encodeURIComponent("/wallet/top-up/success")}`,
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { WalletTopUpForm } from "@/app/wallet/top-up/_components/WalletTopUpForm";
import { getTranslations } from "@/i18n/server";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function WalletTopUpPage({
  searchParams,
}: {
  searchParams: Promise<{ dog?: string }>;
}) {
  const { t } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const email = session.user?.email ?? "";
  const { dog: preselectedDog } = await searchParams;

  const allDogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { name: "asc" },
    include: { walletLink: true },
  });

  if (allDogs.length === 0) redirect("/dogs/new");

  const walletDogs = allDogs.filter((dog) => dog.walletLink?.walletCardId);
  const options = walletDogs.map((dog) => ({
    id: dog.id,
    name: dog.name,
    woofId: dog.woofId,
    walletCardId: dog.walletLink!.walletCardId,
  }));

  const dogsWithoutWallet = allDogs
    .filter((dog) => !dog.walletLink?.walletCardId)
    .map((dog) => ({ id: dog.id, name: dog.name }));

  const defaultDog =
    options.find((d) => d.id === preselectedDog)?.id ?? options[0]?.id;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <Link href="/dogs" className="text-sm text-[var(--foreground-muted)] hover:underline">
        {t("wallet.topUp.back")}
      </Link>
      <WalletTopUpForm
        dogs={options}
        dogsWithoutWallet={dogsWithoutWallet}
        userEmail={email}
        preselectedDogId={defaultDog}
      />
    </div>
  );
}

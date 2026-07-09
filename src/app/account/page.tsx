import Link from "next/link";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { PushNotificationPrompt } from "@/app/_components/PushNotificationPrompt";
import { AccountSettingsForms } from "@/app/account/_components/AccountSettingsForms";
import { getTranslations } from "@/i18n/server";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const { t } = await getTranslations();
  const session = await requireUser();
  const email = session.user?.email ?? "";
  const userId = (session.user as { id: string }).id;

  const walletDogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId, walletLink: { isNot: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, walletLink: { select: { walletCardId: true } } },
  });

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-3">
        <DbhLogo variant="nav" className="mx-auto h-12 w-12" />
        <h1 className="font-display text-3xl">{t("account.title")}</h1>
        <p className="text-sm text-black/60">
          {t("account.description")}
        </p>
      </div>

      <section className="card-luxe p-5 space-y-3">
        <h2 className="font-display text-xl">{t("account.wallet.title")}</h2>
        <p className="text-sm text-[var(--foreground-muted)]">
          {t("account.wallet.description")}
        </p>
        {walletDogs.length > 0 ? (
          <>
            <ul className="text-sm space-y-1">
              {walletDogs.map((dog) => (
                <li key={dog.id}>
                  {dog.name} · <span className="font-mono">{dog.walletLink?.walletCardId}</span>
                </li>
              ))}
            </ul>
            <Link href="/wallet/top-up" className="btn btn-primary text-sm inline-flex">
              {t("account.wallet.topUp")}
            </Link>
          </>
        ) : (
          <Link href="/dogs" className="btn btn-secondary text-sm inline-flex">
            {t("account.wallet.linkFirst")}
          </Link>
        )}
      </section>

      <PushNotificationPrompt />

      <AccountSettingsForms email={email} />
    </div>
  );
}

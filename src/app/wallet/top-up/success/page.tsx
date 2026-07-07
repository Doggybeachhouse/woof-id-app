import Link from "next/link";

import { getTranslations } from "@/i18n/server";
import { requireUser } from "@/lib/serverAuth";

export default async function WalletTopUpSuccessPage() {
  const { t } = await getTranslations();
  await requireUser();

  return (
    <div className="card-luxe p-8 max-w-lg mx-auto text-center space-y-4">
      <p className="text-5xl" aria-hidden>
        ✅
      </p>
      <h1 className="font-display text-3xl">{t("wallet.topUp.successTitle")}</h1>
      <p className="text-[var(--foreground-muted)]">{t("wallet.topUp.successBody")}</p>
      <div className="flex flex-col gap-3 pt-2">
        <Link href="/dogs" className="btn btn-primary">
          {t("wallet.topUp.toDogs")}
        </Link>
        <Link href="/wallet/top-up" className="btn btn-secondary">
          {t("wallet.topUp.title")}
        </Link>
      </div>
    </div>
  );
}

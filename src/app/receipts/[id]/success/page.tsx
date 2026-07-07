import Link from "next/link";
import { getTranslations } from "@/i18n/server";

export default async function ReceiptSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ units?: string; dog?: string }>;
}) {
  const { t } = await getTranslations();
  const { units, dog } = await searchParams;
  const unitCount = parseInt(units ?? "0", 10) || 0;
  const dogName = dog ?? t("receipts.success.defaultDogName");

  return (
    <div className="card p-8 text-center space-y-4">
      <p className="text-5xl">🧾</p>
      <h1 className="font-display text-3xl">{t("receipts.success.title")}</h1>
      <p className="text-lg">
        {t("receipts.success.message", { dogName })}
      </p>
      {unitCount > 0 && (
        <div className="space-y-1">
          <span className="coin-badge text-base inline-flex">
            {t("receipts.success.coinsEarned", { count: unitCount })}
          </span>
          <p className="text-xs text-black/50">
            {unitCount === 1
              ? t("receipts.success.itemsSingular", { count: unitCount })
              : t("receipts.success.itemsPlural", { count: unitCount })}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-3 pt-4">
        <Link href="/dogs" className="btn btn-primary">
          {t("receipts.success.toDogProfiles")}
        </Link>
        <Link href="/receipts/scan" className="btn btn-secondary">
          {t("receipts.success.scanAnother")}
        </Link>
      </div>
    </div>
  );
}

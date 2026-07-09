import Link from "next/link";
import { getTranslations } from "@/i18n/server";

export default async function ReceiptSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ coins?: string; total?: string; dog?: string; units?: string }>;
}) {
  const { t } = await getTranslations();
  const { coins, total, dog, units } = await searchParams;
  const coinCount = parseInt(coins ?? units ?? "0", 10) || 0;
  const purchaseTotal = total ? parseFloat(total.replace(",", ".")) : null;
  const dogName = dog ?? t("receipts.success.defaultDogName");

  return (
    <div className="card p-8 text-center space-y-4">
      <p className="text-5xl">🧾</p>
      <h1 className="font-display text-3xl">{t("receipts.success.title")}</h1>
      <p className="text-lg">
        {t("receipts.success.message", { dogName })}
      </p>
      {coinCount > 0 && (
        <div className="space-y-1">
          <span className="coin-badge text-base inline-flex">
            {t("receipts.success.coinsEarned", { count: coinCount })}
          </span>
          {purchaseTotal != null && Number.isFinite(purchaseTotal) && (
            <p className="text-xs text-black/50">
              {t("receipts.success.purchaseTotal", {
                total: purchaseTotal.toFixed(2),
              })}
            </p>
          )}
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

import Link from "next/link";
import { getTranslations } from "@/i18n/server";

export default async function CheckInSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; loc?: string }>;
}) {
  const { t } = await getTranslations();
  const { name, loc } = await searchParams;
  const dogName = name ?? t("checkIn.success.defaultDogName");
  const location = loc ?? t("checkIn.success.defaultLocation");

  return (
    <div className="card p-8 text-center space-y-4">
      <p className="text-5xl">🎉</p>
      <h1 className="font-display text-3xl">{t("checkIn.success.title")}</h1>
      <p className="text-lg">
        {t("checkIn.success.message", { dogName, location })}
      </p>
      <p className="coin-badge inline-flex text-base">{t("checkIn.success.coinsEarned")}</p>
      <div className="flex flex-col gap-3 pt-4">
        <Link href="/dogs" className="btn btn-primary">
          {t("checkIn.success.toDogProfile")}
        </Link>
        <Link href="/" className="text-sm underline text-black/60">
          {t("checkIn.success.home")}
        </Link>
      </div>
    </div>
  );
}

import { CheckInSuccessView } from "@/app/check-in/_components/CheckInSuccessView";
import { getTranslations } from "@/i18n/server";
import { requireUser } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function CheckInSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; loc?: string }>;
}) {
  const { t } = await getTranslations();
  await requireUser();
  const { name, loc } = await searchParams;
  const dogName = name ?? t("checkIn.success.defaultDogName");
  const location = loc ?? t("checkIn.success.defaultLocation");

  return <CheckInSuccessView dogName={dogName} location={location} />;
}

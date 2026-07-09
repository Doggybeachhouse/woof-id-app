import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";

import { CheckInForm } from "@/app/check-in/_components/CheckInForm";
import { CheckInQrScanner } from "@/app/check-in/_components/CheckInQrScanner";
import { getTranslations } from "@/i18n/server";
import {
  getDogsCheckedInToday,
  isValidCheckInQrAccess,
} from "@/lib/checkin/qrGate";
import { DEFAULT_LOCATION } from "@/lib/gamification/coins";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

const LOCATIONS: Record<string, string> = {
  zandvoort: DEFAULT_LOCATION,
};

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{
    loc?: string;
    token?: string;
    dog?: string;
    error?: string;
  }>;
}) {
  const { t } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const { loc, token, dog: preselectedDog, error: errorParam } = await searchParams;

  if (!isValidCheckInQrAccess(loc, token)) {
    const invalidReason =
      loc != null || token != null ? ("expired" as const) : undefined;
    return <CheckInQrScanner invalidReason={invalidReason} />;
  }

  const location = LOCATIONS[loc ?? "zandvoort"] ?? DEFAULT_LOCATION;
  const locKey = loc ?? "zandvoort";

  const dogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { name: "asc" },
  });

  if (dogs.length === 0) redirect("/dogs/new");

  const checkedInToday = await getDogsCheckedInToday(
    dogs.map((d) => d.id),
    prisma,
  );
  const eligibleDogs = dogs.filter((d) => !checkedInToday.has(d.id));

  return (
    <div className="space-y-6">
      <div className="card p-6 text-center space-y-2">
        <p className="text-4xl">🏖️</p>
        <h1 className="font-display text-3xl">{t("checkIn.page.title")}</h1>
        <p className="text-[var(--foreground-muted)]">{location}</p>
        <p className="text-xs text-[var(--foreground-muted)]">
          {DateTime.now().setZone("Europe/Amsterdam").toFormat("cccc d MMMM, HH:mm")}
        </p>
      </div>

      {errorParam && (
        <div className="card p-4 text-sm text-red-700 bg-red-50 border-red-200">
          {errorParam}
        </div>
      )}

      {eligibleDogs.length === 0 ? (
        <div className="card p-6 space-y-3 text-center">
          <p className="font-semibold">{t("checkIn.page.alreadyCheckedInTitle")}</p>
          <p className="text-sm text-[var(--foreground-muted)]">
            {t("checkIn.page.alreadyCheckedInBody")}
          </p>
          <Link href="/" className="btn btn-secondary inline-flex">
            {t("checkIn.page.backHome")}
          </Link>
        </div>
      ) : (
        <CheckInForm
          dogs={eligibleDogs.map((d) => ({
            id: d.id,
            name: d.name,
            woofId: d.woofId,
          }))}
          checkedInTodayNames={dogs
            .filter((d) => checkedInToday.has(d.id))
            .map((d) => d.name)}
          locKey={locKey}
          token={token ?? ""}
          preselectedDogId={preselectedDog}
        />
      )}
    </div>
  );
}

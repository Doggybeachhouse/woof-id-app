import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";

import { getTranslations } from "@/i18n/server";
import { requireUser, isStaffRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ dogId: string }>;
}) {
  const { t } = await getTranslations();
  const { dogId } = await params;
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  const dog = await prisma.dogProfile.findFirst({
    where: isStaffRole(role)
      ? { id: dogId }
      : { id: dogId, ownerUserId: userId },
    include: {
      journeyEvents: { orderBy: { occurredAt: "desc" } },
    },
  });

  if (!dog) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dogs/${dog.id}`} className="text-sm text-black/50 hover:underline">
          {t("dogs.journey.back", { dogName: dog.name })}
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("dogs.journey.title")}</h1>
        <p className="text-[var(--foreground-muted)]">{dog.woofId}</p>
      </div>

      <ol className="relative border-l-2 border-[#ff416e]/30 ml-3 space-y-6">
        {dog.journeyEvents.map((ev) => (
          <li key={ev.id} className="ml-6">
            <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full bg-[#ff416e]" />
            <p className="text-xs text-black/50">
              {DateTime.fromJSDate(ev.occurredAt).toFormat("d MMMM yyyy — HH:mm")}
            </p>
            <p className="font-semibold">{ev.title}</p>
            {ev.body && <p className="text-sm text-black/70">{ev.body}</p>}
          </li>
        ))}
      </ol>

      {dog.journeyEvents.length === 0 && (
        <p className="text-black/50 text-sm">{t("dogs.journey.empty")}</p>
      )}
    </div>
  );
}

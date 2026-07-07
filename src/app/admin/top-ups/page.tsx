import Link from "next/link";
import { DateTime } from "luxon";

import { registerTopUpAction } from "@/app/dogs/actions";
import { getTranslations } from "@/i18n/server";
import { requireStaff } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function AdminTopUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ dog?: string }>;
}) {
  const { t } = await getTranslations();
  await requireStaff();
  const { dog: preselected } = await searchParams;

  const dogs = await prisma.dogProfile.findMany({
    orderBy: { name: "asc" },
    include: { owner: { select: { email: true } } },
  });

  const recentTopUps = await prisma.topUp.findMany({
    orderBy: { toppedUpAt: "desc" },
    take: 10,
    include: {
      dog: { select: { name: true, woofId: true } },
      registeredBy: { select: { email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-black/50 hover:underline">
          {t("admin.topUps.back")}
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("admin.topUps.title")}</h1>
        <p className="text-sm text-black/60">
          {t("admin.topUps.description")}
        </p>
      </div>

      <form action={registerTopUpAction} className="card p-6 space-y-4">
        <div>
          <label className="label" htmlFor="dogProfileId">
            {t("admin.topUps.dogLabel")}
          </label>
          <select
            id="dogProfileId"
            name="dogProfileId"
            className="input"
            defaultValue={preselected ?? ""}
            required
          >
            <option value="" disabled>
              {t("admin.topUps.dogPlaceholder")}
            </option>
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.woofId}) — {d.owner.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amountEur">
            {t("admin.topUps.amountLabel")}
          </label>
          <input
            id="amountEur"
            name="amountEur"
            type="text"
            inputMode="decimal"
            className="input"
            placeholder={t("admin.topUps.amountPlaceholder")}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="note">
            {t("admin.topUps.noteLabel")}
          </label>
          <input id="note" name="note" className="input" />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          {t("admin.topUps.submit")}
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="font-display text-xl">{t("admin.topUps.recentTitle")}</h2>
        {recentTopUps.map((topUp) => (
          <div key={topUp.id} className="card p-3 text-sm">
            <p className="font-semibold">
              {topUp.dog.name} — €{Number(topUp.amountEur).toFixed(2)}
            </p>
            <p className="text-black/50 text-xs">
              {DateTime.fromJSDate(topUp.toppedUpAt).toFormat("d MMM yyyy HH:mm")} ·{" "}
              {topUp.registeredBy?.email ?? t("admin.topUps.registeredBySystem")}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

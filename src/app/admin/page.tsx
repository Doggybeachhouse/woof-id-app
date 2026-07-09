import Link from "next/link";

import { getTranslations } from "@/i18n/server";
import { requireStaff } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function AdminHomePage() {
  const { t } = await getTranslations();
  await requireStaff();

  const [dogCount, visitCount, topUpSum, recentDogs] = await Promise.all([
    prisma.dogProfile.count(),
    prisma.visit.count(),
    prisma.topUp.aggregate({ _sum: { amountEur: true } }),
    prisma.dogProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { owner: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">{t("admin.home.title")}</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-display">{dogCount}</p>
          <p className="text-xs text-black/50">{t("admin.home.dogProfiles")}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-display">{visitCount}</p>
          <p className="text-xs text-black/50">{t("admin.home.checkIns")}</p>
        </div>
        <div className="card p-4 text-center col-span-2">
          <p className="text-2xl font-display">
            €{Number(topUpSum._sum.amountEur ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-black/50">{t("admin.home.totalTopUps")}</p>
        </div>
      </div>

      <div className="card-luxe p-5 space-y-3 text-sm">
        <h2 className="font-display text-xl">{t("admin.home.qrTabletTitle")}</h2>
        <p className="text-[var(--foreground-muted)]">
          {t("admin.home.qrTabletDescription")}
        </p>
        <Link href="/admin/check-in-display" className="btn btn-primary">
          {t("admin.home.openQrDisplay")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/dogs" className="btn btn-secondary">
          {t("admin.home.allDogs")}
        </Link>
        <Link href="/admin/top-ups" className="btn btn-secondary">
          {t("admin.home.registerTopUp")}
        </Link>
        <Link href="/admin/vouchers" className="btn btn-primary">
          {t("admin.home.scanVouchers")}
        </Link>
        <Link href="/admin/users" className="btn btn-secondary">
          {t("admin.home.accountHelp")}
        </Link>
        <Link href="/admin/push" className="btn btn-secondary">
          {t("admin.home.pushNotifications")}
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-xl">{t("admin.home.recentProfiles")}</h2>
        {recentDogs.map((d) => (
          <Link
            key={d.id}
            href={`/dogs/${d.id}`}
            className="card p-3 block text-sm hover:shadow-md"
          >
            <span className="font-semibold">{d.name}</span> — {d.woofId}
            <span className="text-black/40 ml-2">{d.owner.email}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}

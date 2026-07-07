import Link from "next/link";

import { getTranslations } from "@/i18n/server";
import { requireStaff } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function AdminDogsPage() {
  const { t } = await getTranslations();
  await requireStaff();

  const dogs = await prisma.dogProfile.findMany({
    orderBy: { visitCount: "desc" },
    include: {
      owner: { select: { email: true, name: true } },
      walletLink: true,
      _count: { select: { topUps: true, achievements: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-black/50 hover:underline">
          {t("admin.dogs.back")}
        </Link>
        <h1 className="font-display text-3xl mt-2">{t("admin.dogs.title")}</h1>
      </div>

      <div className="space-y-3">
        {dogs.map((dog) => (
          <Link
            key={dog.id}
            href={`/dogs/${dog.id}`}
            className="card p-4 block hover:shadow-md"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-display text-xl">{dog.name}</p>
                <p className="text-sm text-black/50">{dog.woofId}</p>
                <p className="text-xs text-black/40">
                  {dog.owner.name ?? dog.owner.email}
                </p>
              </div>
              <div className="text-right text-sm space-y-1">
                <p>🪙 {dog.woofCoins}</p>
                <p className="text-black/50">{t("admin.dogs.visits", { count: dog.visitCount })}</p>
                <p className="text-black/50">{t("admin.dogs.topUps", { count: dog._count.topUps })}</p>
                <p className="text-black/50">{t("admin.dogs.badges", { count: dog._count.achievements })}</p>
              </div>
            </div>
            {dog.walletLink && (
              <p className="text-xs mt-2 text-black/40">
                {t("admin.dogs.wallet", { walletCardId: dog.walletLink.walletCardId })}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

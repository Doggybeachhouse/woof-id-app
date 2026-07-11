import Link from "next/link";

import { getTranslations } from "@/i18n/server";
import { dogPhotoApiSrc } from "@/lib/dogs/photoUrl";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function DogsPage() {
  const { t } = await getTranslations();
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;

  const dogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "desc" },
    include: { walletLink: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 page-header">
        <h1 className="font-display text-3xl">{t("dogs.list.title")}</h1>
        <Link href="/dogs/new" className="btn btn-primary text-sm py-2.5 px-4">
          {t("dogs.list.addDog")}
        </Link>
      </div>

      {dogs.length === 0 ? (
        <div className="empty-state space-y-4">
          <div className="empty-state__icon" aria-hidden>
            🐕
          </div>
          <p className="text-[var(--foreground-muted)]">{t("dogs.list.empty")}</p>
          <Link href="/dogs/new" className="btn btn-primary">
            {t("dogs.list.createFirst")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {dogs.map((dog) => (
            <div key={dog.id} className="card p-4">
              <div className="flex justify-between items-start gap-3">
                <Link href={`/dogs/${dog.id}`} className="flex gap-3 min-w-0 flex-1">
                  <div className="dog-card__avatar w-14 h-14 rounded-xl overflow-hidden shrink-0">
                    {dog.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dogPhotoApiSrc(dog.id, dog.updatedAt)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      "🐕"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-2xl">{dog.name}</p>
                    <p className="text-sm text-[var(--foreground-muted)]">{dog.woofId}</p>
                    {dog.walletLink && (
                      <p className="text-xs text-[var(--accent-pink)] mt-1 font-mono">
                        {t("dogs.list.wallet", { walletCardId: dog.walletLink.walletCardId })}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="text-right space-y-2 shrink-0">
                  <span className="coin-badge">🪙 {dog.woofCoins}</span>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {t("dogs.list.visits", { count: dog.visitCount })}
                  </p>
                  {dog.walletLink && (
                    <Link
                      href={`/wallet/top-up?dog=${dog.id}`}
                      className="btn btn-secondary text-xs py-1.5 px-3 inline-flex"
                    >
                      {t("dogs.list.topUp")}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

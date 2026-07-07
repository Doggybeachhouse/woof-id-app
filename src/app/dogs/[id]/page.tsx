import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";

import { getTranslations } from "@/i18n/server";
import { requireUser, isStaffRole } from "@/lib/serverAuth";
import { getWoofWalletAccountUrl } from "@/lib/wordpress/urls";
import { prisma } from "@/lib/prisma";

const WOOF_WALLET_URL = getWoofWalletAccountUrl();

export default async function DogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getTranslations();
  const { id } = await params;
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const staff = isStaffRole(role);
  const isOwner = !staff;

  const dog = await prisma.dogProfile.findFirst({
    where: staff ? { id } : { id, ownerUserId: userId },
    include: {
      walletLink: true,
      achievements: { include: { achievement: true } },
      journeyEvents: { orderBy: { occurredAt: "desc" }, take: 10 },
      topUps: { orderBy: { toppedUpAt: "desc" }, take: 5 },
    },
  });

  if (!dog) notFound();

  const totalTopUp = dog.topUps.reduce((s, t) => s + Number(t.amountEur), 0);
  const photoSrc = dog.photoUrl ? `/api/dogs/${dog.id}/photo` : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dogs" className="text-sm text-black/50 hover:underline">
          {t("dogs.detail.back")}
        </Link>
        <div className="flex items-start gap-4 mt-3">
          <div className="shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-black/10 bg-gradient-to-br from-[#ffe8ef] to-[#fff8dc] flex items-center justify-center text-4xl">
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt={dog.name}
                className="w-full h-full object-cover"
              />
            ) : (
              "🐕"
            )}
          </div>
          <div className="flex-1 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-4xl leading-tight">{dog.name}</h1>
              <p className="text-black/50 font-mono text-sm">{dog.woofId}</p>
            </div>
            <Link
              href={`/rewards?dog=${dog.id}`}
              className="coin-badge text-lg shrink-0 hover:opacity-90"
            >
              🪙 {dog.woofCoins}
            </Link>
          </div>
        </div>
      </div>

      <section className="card p-5 space-y-3 border-[#ff416e]/25 bg-gradient-to-br from-white to-[#fff5f8]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl">{t("dogs.detail.woofWallet")}</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#ff416e]">
            {t("dogs.detail.prepaid")}
          </span>
        </div>
        {dog.walletLink ? (
          <>
            <p className="font-mono text-lg tracking-wide">
              {dog.walletLink.walletCardId}
            </p>
            <p className="text-sm text-black/60">
              {t("dogs.detail.balanceHintPrefix")}{" "}
              <a
                href={WOOF_WALLET_URL}
                className="underline text-[#ff416e]"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("dogs.detail.websiteLink")}
              </a>
              {t("dogs.detail.balanceHintSuffix")}
            </p>
            {isOwner && (
              <Link
                href={`/wallet/top-up?dog=${dog.id}`}
                className="btn btn-primary text-sm inline-flex"
              >
                {t("dogs.detail.topUp")}
              </Link>
            )}
          </>
        ) : (
          <p className="text-sm text-black/65">
            {t("dogs.detail.noWalletLinked")}{" "}
            <strong>{t("dogs.detail.editProfileBold")}</strong>.
          </p>
        )}
        {isOwner && (
          <Link href={`/dogs/${dog.id}/edit`} className="btn btn-secondary text-sm inline-flex">
            {dog.walletLink ? t("dogs.detail.editWalletOrProfile") : t("dogs.detail.linkWallet")}
          </Link>
        )}
      </section>

      <div className="card p-5 space-y-3 text-sm">
        {dog.breed && <p><strong>{t("dogs.detail.breed")}</strong> {dog.breed}</p>}
        {dog.birthday && (
          <p>
            <strong>{t("dogs.detail.birthday")}</strong>{" "}
            {DateTime.fromJSDate(dog.birthday).toFormat("d MMMM yyyy")}
          </p>
        )}
        {dog.weightKg != null && <p><strong>{t("dogs.detail.weight")}</strong> {dog.weightKg} {t("dogs.detail.weightUnit")}</p>}
        {dog.favoriteSnack && <p><strong>{t("dogs.detail.favoriteSnack")}</strong> {dog.favoriteSnack}</p>}
        {dog.favoriteIceCream && (
          <p><strong>{t("dogs.detail.favoriteIceCream")}</strong> {dog.favoriteIceCream}</p>
        )}
        {dog.personality && <p><strong>{t("dogs.detail.personality")}</strong> {dog.personality}</p>}
        <p><strong>{t("dogs.detail.visits")}</strong> {dog.visitCount}</p>
        <p><strong>{t("dogs.detail.totalTopUpAdmin")}</strong> €{totalTopUp.toFixed(2)}</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {isOwner && (
          <Link href={`/dogs/${dog.id}/edit`} className="btn btn-secondary">
            {t("dogs.detail.editProfile")}
          </Link>
        )}
        <Link href={`/rewards?dog=${dog.id}`} className="btn btn-primary">
          {t("dogs.detail.rewards")}
        </Link>
        <Link href={`/receipts/scan?dog=${dog.id}`} className="btn btn-secondary">
          {t("dogs.detail.scanReceipt")}
        </Link>
        <Link href="/check-in" className="btn btn-secondary">
          {t("dogs.detail.checkIn")}
        </Link>
      </div>

      <p className="text-xs text-black/45 text-center">
        {t("dogs.detail.checkInHint")}
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">{t("dogs.detail.achievementsTitle")}</h2>
        {dog.achievements.length === 0 ? (
          <p className="text-sm text-black/50">{t("dogs.detail.achievementsEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {dog.achievements.map((a) => (
              <div key={a.id} className="card p-3 text-center">
                <div className="text-3xl">{a.achievement.icon}</div>
                <p className="font-semibold text-sm mt-1">{a.achievement.name}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 pt-2">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl">{t("dogs.detail.timelineTitle")}</h2>
          <Link
            href={`/journey/${dog.id}`}
            className="text-sm font-semibold text-[var(--accent-gold)] hover:text-[var(--accent-pink)]"
          >
            {t("dogs.detail.fullTimeline")}
          </Link>
        </div>
        <ul className="space-y-2">
          {dog.journeyEvents.map((ev) => (
            <li key={ev.id} className="card p-3 text-sm">
              <p className="font-semibold">{ev.title}</p>
              <p className="text-black/50 text-xs">
                {DateTime.fromJSDate(ev.occurredAt).toFormat("d MMM yyyy, HH:mm")}
              </p>
              {ev.body && <p className="text-black/70 mt-1">{ev.body}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

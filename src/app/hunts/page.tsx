import Link from "next/link";

import { HuntCatalogCard } from "@/app/hunts/_components/HuntCatalogCard";
import { getTranslations } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import { HUNT_CATALOG } from "@/lib/scavengerHunt/hunts";
import { requireUser } from "@/lib/serverAuth";

export default async function HuntsPage() {
  const { t, locale } = await getTranslations();
  await requireUser();

  const loc = locale as Locale;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 pt-2">
        <p className="eyebrow">{t("hunts.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight">
          {t("hunts.title")}
        </h1>
        <p className="text-[var(--foreground-muted)] text-sm max-w-md mx-auto">
          {t("hunts.subtitle")}
        </p>
      </div>

      <div className="flex justify-center">
        <Link href="/hunts/history" className="btn btn-secondary text-sm">
          {t("hunts.historyLink")}
        </Link>
      </div>

      <div className="space-y-4">
        {HUNT_CATALOG.map((hunt) => (
          <HuntCatalogCard key={hunt.slug} hunt={hunt} locale={loc} />
        ))}
      </div>
    </div>
  );
}

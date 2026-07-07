import Link from "next/link";

import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export async function AppFooter() {
  const { t } = await getTranslations();
  const session = await getSession();
  if (!session?.user) return null;

  const userId = (session.user as { id: string }).id;
  const dogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 6,
  });

  return (
    <footer className="app-footer mt-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {dogs.length > 0 && (
          <div className="space-y-2">
            <p className="footer-label">{t("nav.footer.timeline")}</p>
            <div className="flex flex-wrap gap-2">
              {dogs.map((dog) => (
                <Link
                  key={dog.id}
                  href={`/journey/${dog.id}`}
                  className="footer-chip"
                >
                  {dog.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <a
            href="https://www.doggybeachhouse.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {t("nav.footer.website")}
          </a>
          <Link href="/account" className="footer-link">
            {t("nav.footer.account")}
          </Link>
        </div>

        <p className="footer-brand font-display">
          {t("nav.footer.brandLine")}
        </p>
      </div>
    </footer>
  );
}

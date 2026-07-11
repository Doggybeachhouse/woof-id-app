import Link from "next/link";

import { PushNotificationPrompt } from "@/app/_components/PushNotificationPrompt";
import { NavDogsIcon } from "@/app/_components/nav/NavIcons";
import { AccountLogoutButton } from "@/app/account/_components/AccountLogoutButton";
import { AccountSettingsForms } from "@/app/account/_components/AccountSettingsForms";
import { getTranslations } from "@/i18n/server";
import { isStaffRole, requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const { t } = await getTranslations();
  const session = await requireUser();
  const email = session.user?.email ?? "";
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  const dogs = await prisma.dogProfile.findMany({
    where: { ownerUserId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, woofCoins: true },
  });

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-1">
        <h1 className="font-display text-3xl">{t("account.title")}</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {t("account.description")}
        </p>
      </div>

      <nav className="grid gap-2" aria-label={t("account.menu.ariaLabel")}>
        <Link href="/dogs" className="menu-link">
          <NavDogsIcon className="menu-link__icon" />
          <span className="menu-link__body">
            <span className="menu-link__title">{t("account.menu.dogs.title")}</span>
            <span className="menu-link__desc">
              {dogs.length === 0
                ? t("account.menu.dogs.descEmpty")
                : dogs.length === 1
                  ? t("account.menu.dogs.descOne")
                  : t("account.menu.dogs.descMany", { count: dogs.length })}
            </span>
          </span>
          <span className="menu-link__chevron" aria-hidden>›</span>
        </Link>

        <Link href="/hunts/history" className="menu-link">
          <span className="menu-link__icon text-lg leading-none">🗺️</span>
          <span className="menu-link__body">
            <span className="menu-link__title">{t("hunts.history.title")}</span>
            <span className="menu-link__desc">{t("hunts.history.subtitle")}</span>
          </span>
          <span className="menu-link__chevron" aria-hidden>›</span>
        </Link>

        {isStaffRole(role) && (
          <Link href="/admin" className="menu-link">
            <span className="menu-link__icon text-lg leading-none">⚙️</span>
            <span className="menu-link__body">
              <span className="menu-link__title">{t("nav.links.admin")}</span>
              <span className="menu-link__desc">{t("account.menu.admin.desc")}</span>
            </span>
            <span className="menu-link__chevron" aria-hidden>›</span>
          </Link>
        )}
      </nav>

      <PushNotificationPrompt />

      <AccountSettingsForms email={email} />

      <AccountLogoutButton />
    </div>
  );
}

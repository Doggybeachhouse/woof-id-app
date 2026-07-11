"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { LanguageSwitcher } from "@/app/_components/LanguageSwitcher";
import { NavIcon } from "@/app/_components/nav/NavIcons";
import {
  accountNavItem,
  bottomTabItems,
  isIntroRoute,
  isKioskRoute,
  isNavItemActive,
} from "@/app/_components/nav/navConfig";
import { useI18n } from "@/i18n/client";

export function NavBar({ serverSession }: { serverSession?: Session | null }) {
  const { data: clientSession, status } = useSession();
  const session = clientSession ?? serverSession;
  const pathname = usePathname();
  const { t } = useI18n();
  const role = session?.user?.role;
  const isStaff = role === "STAFF" || role === "ADMIN";
  const isLoggedIn = !!session?.user;

  if (isKioskRoute(pathname)) {
    return null;
  }

  function desktopLinkClass(item: (typeof bottomTabItems)[number]) {
    const active = isNavItemActive(pathname, item);
    return `nav-link nav-link--with-icon ${active ? "nav-link--active" : ""}`;
  }

  const accountActive = isNavItemActive(pathname, accountNavItem);

  function renderGuestActions(compact = false) {
    if (status === "loading" && !session) {
      return <span className="nav-link text-black/40">…</span>;
    }

    return (
      <>
        <Link href="/login" className="nav-link">
          {t("nav.links.login")}
        </Link>
        <Link href="/register" className={`btn btn-primary ${compact ? "text-sm py-2 px-4" : ""}`}>
          {t("nav.links.register")}
        </Link>
      </>
    );
  }

  return (
    <header className="app-header sticky top-0 z-[200]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 py-3 min-h-[3.75rem]">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0 shrink-0"
          >
            <DbhLogo variant="nav" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" href={null} />
            <div className="min-w-0 leading-tight hidden xs:block sm:block">
              <span className="font-display text-base sm:text-lg text-[var(--accent-pink)] block truncate">
                {t("nav.brand.appName")}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-[var(--foreground-muted)] block truncate">
                {t("nav.brand.tagline")}
              </span>
            </div>
          </Link>

          {isLoggedIn ? (
            <>
              {!isIntroRoute(pathname) && (
                <nav
                  className="hidden lg:flex items-center gap-1 flex-1 justify-center"
                  aria-label={t("nav.tabs.ariaLabel")}
                >
                  {bottomTabItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={desktopLinkClass(item)}
                    >
                      <NavIcon name={item.icon} className="nav-link__icon" />
                      {t(item.labelKey)}
                    </Link>
                  ))}
                </nav>
              )}

              <div className={`flex items-center gap-2 shrink-0 ${isIntroRoute(pathname) ? "ml-auto" : "ml-auto lg:ml-0"}`}>
                {!isIntroRoute(pathname) && (
                  <>
                    <Link
                      href="/"
                      className="nav-link nav-link--with-icon lg:hidden"
                      aria-label={t("nav.links.home")}
                    >
                      <NavIcon name="home" className="nav-link__icon" />
                    </Link>
                    <Link
                      href={accountNavItem.href}
                      className={`nav-link nav-link--with-icon ${accountActive ? "nav-link--active" : ""}`}
                      aria-label={t(accountNavItem.labelKey)}
                      aria-current={accountActive ? "page" : undefined}
                    >
                      <NavIcon name="account" className="nav-link__icon" />
                    </Link>
                  </>
                )}
                {isStaff && (
                  <Link href="/admin" className="nav-link text-sm hidden sm:inline-flex">
                    {t("nav.links.admin")}
                  </Link>
                )}
                <LanguageSwitcher />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <nav className="hidden sm:flex items-center gap-1">{renderGuestActions()}</nav>
              <LanguageSwitcher />
              <div className="sm:hidden flex items-center gap-1">{renderGuestActions(true)}</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useRef } from "react";

import { DbhLogo } from "@/app/_components/DbhLogo";
import { LanguageSwitcher } from "@/app/_components/LanguageSwitcher";
import { useI18n } from "@/i18n/client";

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="nav-menu-icon-open"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="nav-menu-icon-close"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavBar({ serverSession }: { serverSession?: Session | null }) {
  const { data: clientSession, status } = useSession();
  const session = clientSession ?? serverSession;
  const pathname = usePathname();
  const { t } = useI18n();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const role = session?.user?.role;
  const isStaff = role === "STAFF" || role === "ADMIN";
  const isKioskDisplay = pathname.startsWith("/admin/check-in-display");

  const mainLinks = [
    { href: "/dogs", label: t("nav.links.dogs") },
    { href: "/check-in", label: t("nav.links.checkIn") },
    { href: "/rewards", label: t("nav.links.rewards") },
    { href: "/wallet/top-up", label: t("nav.links.wallet") },
  ];

  const closeMenu = () => {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  };

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const syncBodyScroll = () => {
      document.body.style.overflow = menu.open ? "hidden" : "";
    };

    menu.addEventListener("toggle", syncBodyScroll);
    return () => {
      menu.removeEventListener("toggle", syncBodyScroll);
      document.body.style.overflow = "";
    };
  }, []);

  function linkClass(href: string, mobile = false) {
    const active =
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return mobile
      ? `nav-mobile-link ${active ? "nav-mobile-link--active" : ""}`
      : `nav-link ${active ? "nav-link--active" : ""}`;
  }

  function renderAuthLinks(mobile = false) {
    const closeOnNavigate = mobile ? closeMenu : undefined;

    if (status === "loading" && !session) {
      return (
        <p className={mobile ? "nav-mobile-link text-black/40" : "nav-link text-black/40"}>
          …
        </p>
      );
    }

    if (session?.user) {
      return (
        <>
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(link.href, mobile)}
              onClick={closeOnNavigate}
            >
              {link.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              href="/admin"
              className={linkClass("/admin", mobile)}
              onClick={closeOnNavigate}
            >
              {t("nav.links.admin")}
            </Link>
          )}
          <Link
            href="/account"
            className={linkClass("/account", mobile)}
            onClick={closeOnNavigate}
          >
            {t("nav.links.account")}
          </Link>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              signOut({ callbackUrl: "/" });
            }}
            className={mobile ? "nav-mobile-link nav-mobile-link--ghost" : "nav-link nav-link--ghost"}
            aria-label={t("nav.logout.ariaLabel")}
          >
            {t("nav.logout.label")}
          </button>
        </>
      );
    }

    return (
      <>
        <Link
          href="/login"
          className={mobile ? "nav-mobile-link" : "nav-link"}
          onClick={closeOnNavigate}
        >
          {t("nav.links.login")}
        </Link>
        <Link
          href="/register"
          className={
            mobile
              ? "nav-mobile-link nav-mobile-link--cta"
              : "btn btn-primary text-sm py-2 px-4"
          }
          onClick={closeOnNavigate}
        >
          {t("nav.links.register")}
        </Link>
      </>
    );
  }

  if (isKioskDisplay) {
    return null;
  }

  return (
    <>
      <header className="app-header sticky top-0 z-[200]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3 py-3 min-h-[4.25rem]">
            <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink-0 max-w-[52%] sm:max-w-none">
              <DbhLogo variant="nav" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" href={null} />
              <div className="min-w-0 leading-tight">
                <span className="font-display text-base sm:text-lg text-[var(--accent-pink)] block truncate">
                  {t("nav.brand.appName")}
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[var(--foreground-muted)] block truncate">
                  {t("nav.brand.tagline")}
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center flex-wrap justify-end gap-1 flex-1 min-w-0">
              {renderAuthLinks(false)}
            </nav>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <LanguageSwitcher />
              <details ref={menuRef} className="nav-mobile-menu lg:hidden">
                <summary
                  className="nav-menu-btn"
                  aria-label={t("nav.menu.open")}
                >
                  <MenuIcon />
                  <CloseIcon />
                </summary>
                <button
                  type="button"
                  className="nav-mobile-backdrop"
                  aria-label={t("nav.menu.close")}
                  onClick={closeMenu}
                  tabIndex={-1}
                />
                <nav id="mobile-nav-panel" className="nav-mobile-panel" aria-label={t("nav.menu.open")}>
                  {renderAuthLinks(true)}
                </nav>
              </details>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

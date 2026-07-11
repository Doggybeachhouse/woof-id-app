"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

import {
  NavAccountIcon,
  NavAdminIcon,
  NavLogoutIcon,
  NavWalletIcon,
} from "@/app/_components/nav/NavIcons";
import { useI18n } from "@/i18n/client";

type ProfileMenuProps = {
  isStaff: boolean;
  userName?: string | null;
  variant?: "desktop" | "mobile";
};

function ProfileAvatar({ userName }: { userName?: string | null }) {
  const initial = (userName?.trim()?.[0] ?? "W").toUpperCase();
  return <span className="profile-menu__avatar">{initial}</span>;
}

export function ProfileMenu({ isStaff, userName, variant = "desktop" }: ProfileMenuProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const menuRef = useRef<HTMLDetailsElement>(null);

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

    const onToggle = () => {
      document.body.style.overflow = menu.open ? "hidden" : "";
    };

    menu.addEventListener("toggle", onToggle);
    return () => {
      menu.removeEventListener("toggle", onToggle);
      document.body.style.overflow = "";
    };
  }, []);

  const panelClass =
    variant === "mobile" ? "profile-menu__panel profile-menu__panel--sheet" : "profile-menu__panel";

  return (
    <details ref={menuRef} className="profile-menu">
      <summary
        className="profile-menu__trigger"
        aria-label={t("nav.profile.open")}
      >
        <ProfileAvatar userName={userName} />
        <span className="profile-menu__name hidden sm:inline">{userName ?? t("nav.profile.fallbackName")}</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="profile-menu__chevron hidden sm:block">
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </summary>

      {variant === "mobile" && (
        <button
          type="button"
          className="profile-menu__backdrop lg:hidden"
          aria-label={t("nav.menu.close")}
          onClick={closeMenu}
          tabIndex={-1}
        />
      )}

      <div className={panelClass}>
        <p className="profile-menu__heading">{t("nav.profile.title")}</p>

        <Link
          href="/wallet/top-up"
          className="profile-menu__item"
          onClick={closeMenu}
        >
          <NavWalletIcon className="profile-menu__item-icon" />
          {t("nav.links.wallet")}
        </Link>

        <Link
          href="/account"
          className="profile-menu__item"
          onClick={closeMenu}
        >
          <NavAccountIcon className="profile-menu__item-icon" />
          {t("nav.links.account")}
        </Link>

        {isStaff && (
          <Link
            href="/admin"
            className="profile-menu__item"
            onClick={closeMenu}
          >
            <NavAdminIcon className="profile-menu__item-icon" />
            {t("nav.links.admin")}
          </Link>
        )}

        <div className="profile-menu__divider" />

        <button
          type="button"
          className="profile-menu__item profile-menu__item--ghost"
          onClick={() => {
            closeMenu();
            signOut({ callbackUrl: "/" });
          }}
        >
          <NavLogoutIcon className="profile-menu__item-icon" />
          {t("nav.logout.label")}
        </button>
      </div>
    </details>
  );
}

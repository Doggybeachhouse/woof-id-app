"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { NavIcon } from "@/app/_components/nav/NavIcons";
import { bottomTabItems, isNavItemActive, shouldShowBottomTabs } from "@/app/_components/nav/navConfig";
import { useI18n } from "@/i18n/client";

export function BottomTabBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { t } = useI18n();

  if (status === "loading" && !session) return null;
  if (!session?.user) return null;
  if (!shouldShowBottomTabs(pathname)) return null;

  return (
    <nav
      className="bottom-tab-bar lg:hidden"
      aria-label={t("nav.tabs.ariaLabel")}
    >
      <div className="bottom-tab-bar__inner">
        {bottomTabItems.map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-tab ${active ? "bottom-tab--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon name={item.icon} className="bottom-tab__icon" />
              <span className="bottom-tab__label">{t(item.shortLabelKey ?? item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

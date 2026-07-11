export type NavItem = {
  href: string;
  labelKey: string;
  shortLabelKey?: string;
  icon: "home" | "hunts" | "guide" | "checkIn" | "receipts" | "rewards" | "account";
  match?: (pathname: string) => boolean;
};

export const bottomTabItems: NavItem[] = [
  {
    href: "/",
    labelKey: "nav.links.home",
    shortLabelKey: "nav.tabs.home",
    icon: "home",
    match: (pathname) => pathname === "/",
  },
  {
    href: "/hunts",
    labelKey: "nav.links.hunts",
    shortLabelKey: "nav.tabs.huntsShort",
    icon: "hunts",
    match: (pathname) =>
      pathname.startsWith("/hunts") || pathname.startsWith("/hunt"),
  },
  {
    href: "/guide",
    labelKey: "nav.links.guide",
    shortLabelKey: "nav.tabs.guideShort",
    icon: "guide",
    match: (pathname) => pathname.startsWith("/guide"),
  },
  {
    href: "/check-in",
    labelKey: "nav.links.checkIn",
    shortLabelKey: "nav.tabs.checkInShort",
    icon: "checkIn",
    match: (pathname) => pathname.startsWith("/check-in"),
  },
  {
    href: "/receipts/scan",
    labelKey: "nav.links.receipts",
    shortLabelKey: "nav.tabs.receiptsShort",
    icon: "receipts",
    match: (pathname) => pathname.startsWith("/receipts"),
  },
  {
    href: "/rewards",
    labelKey: "nav.links.rewards",
    shortLabelKey: "nav.tabs.rewardsShort",
    icon: "rewards",
    match: (pathname) => pathname.startsWith("/rewards"),
  },
];

/** @deprecated Use bottomTabItems — account lives in the top bar. */
export const mainTabItems = bottomTabItems;

export const accountNavItem: NavItem = {
  href: "/account",
  labelKey: "nav.links.account",
  shortLabelKey: "nav.tabs.accountShort",
  icon: "account",
  match: (pathname) =>
    pathname.startsWith("/account") ||
    pathname.startsWith("/dogs") ||
    pathname.startsWith("/journey") ||
    pathname.startsWith("/wallet"),
};

export function isNavItemActive(pathname: string, item: NavItem) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function isIntroRoute(pathname: string) {
  return pathname === "/";
}

export function shouldShowBottomTabs(pathname: string) {
  if (isKioskRoute(pathname)) return false;
  if (isIntroRoute(pathname)) return false;
  return true;
}

export function isKioskRoute(pathname: string) {
  return (
    pathname.startsWith("/admin/check-in-display") ||
    pathname.startsWith("/admin/voucher-display")
  );
}

export function isAuthRoute(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

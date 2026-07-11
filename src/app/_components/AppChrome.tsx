"use client";

import { usePathname } from "next/navigation";

import { AppFooter } from "@/app/_components/AppFooter";
import { BottomTabBar } from "@/app/_components/nav/BottomTabBar";
import { shouldShowBottomTabs } from "@/app/_components/nav/navConfig";

type AppChromeProps = {
  children: React.ReactNode;
  isLoggedIn: boolean;
};

export function AppChrome({ children, isLoggedIn }: AppChromeProps) {
  const pathname = usePathname();
  const showBottomTabs = isLoggedIn && shouldShowBottomTabs(pathname);
  const showFooter = isLoggedIn && pathname !== "/" && !pathname.startsWith("/guide");
  const isGuideRoute = pathname.startsWith("/guide");

  return (
    <>
      <div
        className={
          showBottomTabs
            ? isGuideRoute
              ? "app-chrome app-chrome--with-tabs app-chrome--guide"
              : "app-chrome app-chrome--with-tabs"
            : isGuideRoute
              ? "app-chrome app-chrome--guide"
              : "app-chrome"
        }
      >
        {children}
        {showFooter && <AppFooter />}
      </div>
      {showBottomTabs && <BottomTabBar />}
    </>
  );
}

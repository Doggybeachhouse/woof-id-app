import type { Metadata, Viewport } from "next";
import { Montserrat, Protest_Strike } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppFooter } from "@/app/_components/AppFooter";
import { NavBarShell } from "@/app/_components/NavBarShell";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/serverAuth";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const protestStrike = Protest_Strike({
  variable: "--font-protest-strike",
  subsets: ["latin"],
  weight: "400",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("common.meta.title"),
    description: t("common.meta.description"),
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      title: t("common.meta.appleWebAppTitle"),
      statusBarStyle: "default",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#ff416e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getTranslations();
  const session = await getSession();

  return (
    <html
      lang={locale}
      className={`${montserrat.variable} ${protestStrike.variable} h-full antialiased`}
    >
      <body className="min-h-full app-bg">
        <Providers locale={locale} messages={messages} session={session}>
          <div className="min-h-full flex flex-col">
            <NavBarShell />
            <main className="flex-1 px-4 py-7 sm:py-8 max-w-3xl mx-auto w-full">
              {children}
            </main>
            <AppFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}

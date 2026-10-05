import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { DM_Sans } from "next/font/google";
import { CookieConsentProvider } from "@/app/components/cookie-consent";
import { FeedbackToastProvider } from "@/app/components/feedback-toast";
import { AuthHashSession } from "@/app/components/auth-hash-session";
import { SiteBrandProvider } from "@/app/components/site-brand-provider";
import { SentryClient } from "@/app/components/sentry-client";
import { UmamiScript } from "@/app/components/umami-script";
import { messagePack } from "@/app/lib/i18n/pack";
import { LanguageProvider } from "@/app/lib/language";
import { asLang } from "@/app/lib/messages";
import { getPublicI18n, getPublicSentry, getPublicUmami, getSiteBrand } from "@/app/lib/site-admin/repository";
import { localeFromPathname } from "@/app/lib/seo-slugs";
import { displayBrandName } from "@/app/lib/site-brand";
import { getIndexableSiteUrl, siteDescription } from "@/app/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSiteBrand();
  const name = displayBrandName(brand.name);
  return {
    metadataBase: new URL(getIndexableSiteUrl()),
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description: siteDescription,
    applicationName: name,
    icons: brand.faviconUrl ? { icon: brand.faviconUrl } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#102433",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [brand, i18n, umami, sentry] = await Promise.all([getSiteBrand(), getPublicI18n(), getPublicUmami(), getPublicSentry()]);
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || sentry?.dsn || null;
  const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || sentry?.environment || "";
  const pathname = (await headers()).get("x-pathname") ?? "";
  const initialLang = localeFromPathname(pathname) ?? asLang(i18n.defaultCode);
  return (
    <html lang={initialLang} className={dmSans.variable}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <SentryClient dsn={sentryDsn} environment={sentryEnvironment} />
        <SiteBrandProvider brand={brand}>
          <LanguageProvider i18n={i18n} brandName={brand.name} initialLang={initialLang} initialPack={messagePack(initialLang)}>
            <CookieConsentProvider>
              <UmamiScript websiteId={umami?.websiteId ?? null} scriptUrl={umami?.scriptUrl ?? null} />
              <FeedbackToastProvider>{children}</FeedbackToastProvider>
              <AuthHashSession />
            </CookieConsentProvider>
          </LanguageProvider>
        </SiteBrandProvider>
      </body>
    </html>
  );
}

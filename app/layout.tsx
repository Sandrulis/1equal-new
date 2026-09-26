import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { CookieConsentProvider } from "@/app/components/cookie-consent";
import { FeedbackToastProvider } from "@/app/components/feedback-toast";
import { SiteBrandProvider } from "@/app/components/site-brand-provider";
import { SentryClient } from "@/app/components/sentry-client";
import { UmamiScript } from "@/app/components/umami-script";
import { LanguageProvider } from "@/app/lib/language";
import { getPublicI18n, getPublicSentry, getPublicUmami, getSiteBrand } from "@/app/lib/site-admin/repository";
import { getSiteUrl, siteDescription } from "@/app/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSiteBrand();
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: brand.name,
      template: `%s · ${brand.name}`,
    },
    description: siteDescription,
    applicationName: brand.name,
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
  return (
    <html lang={i18n.defaultCode} className={dmSans.variable}>
      <body className="font-sans antialiased">
        <SentryClient dsn={sentryDsn} environment={sentryEnvironment} />
        <SiteBrandProvider brand={brand}>
          <LanguageProvider i18n={i18n} brandName={brand.name}>
            <CookieConsentProvider>
              <UmamiScript websiteId={umami?.websiteId ?? null} scriptUrl={umami?.scriptUrl ?? null} />
              <FeedbackToastProvider>{children}</FeedbackToastProvider>
            </CookieConsentProvider>
          </LanguageProvider>
        </SiteBrandProvider>
      </body>
    </html>
  );
}

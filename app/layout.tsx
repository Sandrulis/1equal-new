import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { CookieConsentProvider } from "@/app/components/cookie-consent";
import { LanguageProvider } from "@/app/lib/language";
import { getSiteUrl, siteDescription, siteName } from "@/app/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
};

export const viewport: Viewport = {
  themeColor: "#102433",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lv" className={dmSans.variable}>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <CookieConsentProvider>{children}</CookieConsentProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

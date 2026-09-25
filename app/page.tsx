import type { Metadata } from "next";
import { LandingPage } from "@/app/components/landing-page";
import { getSiteUrl, siteDescription, siteName, siteTitle } from "@/app/lib/site";

export const metadata: Metadata = {
  title: { absolute: siteTitle },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["hokejs", "amatieru hokejs", "komandas kalendārs", "treniņi", "spēles", "1equal"],
  authors: [{ name: siteName, url: "/" }],
  creator: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "lv_LV",
    alternateLocale: ["en_US"],
    url: "/",
    siteName,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function HomePage() {
  const url = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: siteName,
        url,
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        name: siteName,
        url,
        description: siteDescription,
        inLanguage: "lv",
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: siteTitle,
        description: siteDescription,
        inLanguage: "lv",
        isPartOf: { "@id": `${url}/#website` },
        about: { "@id": `${url}/#app` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#app`,
        name: siteName,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url,
        description: siteDescription,
        inLanguage: "lv",
        publisher: { "@id": `${url}/#organization` },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LandingPage />
    </>
  );
}

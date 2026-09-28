import type { Metadata } from "next";

export const revalidate = 3600;
import { LandingPage } from "@/app/components/landing-page";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { siteTitleFor } from "@/app/lib/site-brand";
import { getSiteUrl, siteDescription, siteSocialDescription } from "@/app/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSiteBrand();
  const title = siteTitleFor(brand.name);
  return {
  title: { absolute: title },
  description: siteDescription,
  applicationName: brand.name,
  authors: [{ name: brand.name, url: getSiteUrl() }],
  creator: brand.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "lv_LV",
    alternateLocale: ["en_US", "ru_RU"],
    url: "/",
    siteName: brand.name,
    title,
    description: siteSocialDescription,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: siteSocialDescription,
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
}

export default async function HomePage() {
  const brand = await getSiteBrand();
  const title = siteTitleFor(brand.name);
  const url = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: brand.name,
        url,
        ...(brand.logoUrl ? { logo: brand.logoUrl } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        name: brand.name,
        url,
        description: siteDescription,
        inLanguage: "lv",
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: title,
        description: siteDescription,
        inLanguage: "lv",
        isPartOf: { "@id": `${url}/#website` },
        about: { "@id": `${url}/#app` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#app`,
        name: brand.name,
        applicationCategory: "SportsApplication",
        operatingSystem: "Web",
        url,
        description: siteDescription,
        inLanguage: "lv",
        ...(brand.logoUrl ? { image: brand.logoUrl } : {}),
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

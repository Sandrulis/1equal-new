import type { Metadata } from "next";
import { LandingPage } from "@/app/components/landing-page";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { siteTitleFor } from "@/app/lib/site-brand";
import { getSiteUrl, siteDescription } from "@/app/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSiteBrand();
  const title = siteTitleFor(brand.name);
  return {
  title: { absolute: title },
  description: siteDescription,
  applicationName: brand.name,
  keywords: ["hokejs", "amatieru hokejs", "komandas kalendārs", "treniņi", "spēles", brand.name],
  authors: [{ name: brand.name, url: "/" }],
  creator: brand.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "lv_LV",
    alternateLocale: ["en_US"],
    url: "/",
    siteName: brand.name,
    title,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title,
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

import type { Metadata } from "next";

export const revalidate = 3600;
import { LandingPage } from "@/app/components/landing-page";
import { getPublicI18n, getSiteBrand } from "@/app/lib/site-admin/repository";
import { asLang, translate } from "@/app/lib/messages";
import { getSiteUrl } from "@/app/lib/site";

function pageLocale(lang: string): string {
  if (lang === "en") return "en_US";
  if (lang === "ru") return "ru_RU";
  return "lv_LV";
}

export async function generateMetadata(): Promise<Metadata> {
  const [brand, i18n] = await Promise.all([getSiteBrand(), getPublicI18n()]);
  const lang = asLang(i18n.defaultCode);
  const title = `${brand.name} · ${translate(lang, "landing.hero.title")}`;
  const description = translate(lang, "landing.seo.description");
  const locale = pageLocale(lang);
  const alternates = ["lv_LV", "en_US", "ru_RU"].filter((item) => item !== locale);
  return {
  title: { absolute: title },
  description,
  applicationName: brand.name,
  authors: [{ name: brand.name, url: getSiteUrl() }],
  creator: brand.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale,
    alternateLocale: alternates,
    url: "/",
    siteName: brand.name,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
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
  const [brand, i18n] = await Promise.all([getSiteBrand(), getPublicI18n()]);
  const lang = asLang(i18n.defaultCode);
  const title = `${brand.name} · ${translate(lang, "landing.hero.title")}`;
  const description = translate(lang, "landing.seo.description");
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
        description,
        inLanguage: lang,
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: title,
        description,
        inLanguage: lang,
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
        description,
        inLanguage: lang,
        ...(brand.logoUrl ? { image: brand.logoUrl } : {}),
        publisher: { "@id": `${url}/#organization` },
      },
    ],
  };

  return (
    <>
      <script id="landing-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LandingPage />
    </>
  );
}

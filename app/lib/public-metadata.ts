import type { Metadata } from "next";
import { PUBLIC_LOCALES, isPublicLocale, pathTail, publicPath, type PublicLocale } from "@/app/lib/seo-slugs";
import { displayBrandName } from "@/app/lib/site-brand";
import { getIndexableSiteUrl } from "@/app/lib/site";

const OG_LOCALE: Record<PublicLocale, string> = {
  lv: "lv_LV",
  en: "en_US",
  ru: "ru_RU",
};

export function absolutePublicUrl(path: string): string {
  const origin = getIndexableSiteUrl();
  if (!path || path === "/") return origin;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

export function localizedPublicPath(path: string, from: PublicLocale, to: PublicLocale): string {
  const tail = pathTail(path) ?? (from === "lv" && (path === "/" || path === "/lv" || path === "/lv/") ? "/" : path);
  return publicPath(to, tail);
}

export function languageAlternates(path: string, locale: PublicLocale): NonNullable<Metadata["alternates"]>["languages"] {
  const tail = pathTail(path) ?? "/";
  const languages: Record<string, string> = {
    "x-default": absolutePublicUrl(publicPath("lv", tail)),
  };
  for (const code of PUBLIC_LOCALES) {
    languages[code] = absolutePublicUrl(publicPath(code, tail));
  }
  void locale;
  return languages;
}

export function publicPageMetadata(input: {
  locale: PublicLocale;
  path: string;
  title: string;
  description: string;
  imageAlt: string;
  siteName: string;
}): Metadata {
  const url = absolutePublicUrl(input.path);
  const siteName = displayBrandName(input.siteName);
  const others = PUBLIC_LOCALES.filter((code) => code !== input.locale).map((code) => OG_LOCALE[code]);
  return {
    title: { absolute: input.title },
    description: input.description,
    applicationName: siteName,
    authors: [{ name: siteName, url: getIndexableSiteUrl() }],
    creator: siteName,
    alternates: {
      canonical: url,
      languages: languageAlternates(input.path, input.locale),
    },
    openGraph: {
      type: "website",
      url,
      siteName,
      title: input.title,
      description: input.description,
      locale: OG_LOCALE[input.locale],
      alternateLocale: others,
      images: [{ url: absolutePublicUrl("/opengraph-image"), width: 1200, height: 630, alt: input.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [{ url: absolutePublicUrl("/opengraph-image"), alt: input.imageAlt }],
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

export function requirePublicLocale(value: string): PublicLocale | null {
  return isPublicLocale(value) ? value : null;
}

type JsonLdNode = Record<string, unknown>;

function absoluteAsset(url: string): string {
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return absolutePublicUrl(url);
}

export function homepageJsonLd(input: {
  locale: PublicLocale;
  path: string;
  title: string;
  description: string;
  name: string;
  logoUrl: string | null;
  contactEmail: string;
  featureList: string[];
}): JsonLdNode {
  const origin = getIndexableSiteUrl();
  const pageUrl = absolutePublicUrl(input.path);
  const logo = input.logoUrl ? absoluteAsset(input.logoUrl) : null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: input.name,
        url: origin,
        ...(logo ? { logo } : {}),
        ...(input.contactEmail
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                email: input.contactEmail,
                contactType: "customer support",
                availableLanguage: [...PUBLIC_LOCALES],
              },
            }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: input.name,
        url: origin,
        description: input.description,
        inLanguage: [...PUBLIC_LOCALES],
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: input.title,
        description: input.description,
        inLanguage: input.locale,
        isPartOf: { "@id": `${origin}/#website` },
        about: { "@id": `${origin}/#app` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#app`,
        name: input.name,
        applicationCategory: "SportsApplication",
        applicationSubCategory: "Sports team management",
        operatingSystem: "Web",
        url: origin,
        description: input.description,
        inLanguage: [...PUBLIC_LOCALES],
        featureList: input.featureList,
        ...(logo ? { image: logo } : {}),
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}

export function faqPageJsonLd(locale: PublicLocale, items: { q: string; a: string }[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function webPageJsonLd(input: {
  locale: PublicLocale;
  path: string;
  title: string;
  description: string;
  crumbs: { name: string; path: string }[];
}): JsonLdNode {
  const origin = getIndexableSiteUrl();
  const pageUrl = absolutePublicUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: input.title,
        description: input.description,
        inLanguage: input.locale,
        isPartOf: { "@id": `${origin}/#website` },
        about: { "@id": `${origin}/#app` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: input.crumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absolutePublicUrl(item.path),
        })),
      },
    ],
  };
}

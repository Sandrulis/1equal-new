import type { MetadataRoute } from "next";
import { absolutePublicUrl, languageAlternates } from "@/app/lib/public-metadata";
import { LEGACY_SPORT_REDIRECTS, PUBLIC_LOCALES, publicPath, type PublicLocale } from "@/app/lib/seo-slugs";
import { SEO_PAGES } from "@/app/lib/seo-landings";
import { TOPIC_PAGES } from "@/app/lib/topic-pages";

function languagesFor(path: string): Record<string, string> {
  const value = languageAlternates(path, "lv");
  const languages: Record<string, string> = {};
  if (!value) return languages;
  for (const [code, href] of Object.entries(value)) {
    if (typeof href === "string") languages[code] = href;
  }
  return languages;
}

function entry(locale: PublicLocale, tail: string): MetadataRoute.Sitemap[number] {
  const path = publicPath(locale, tail);
  return {
    url: absolutePublicUrl(path),
    alternates: { languages: languagesFor(path) },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [];
  for (const locale of PUBLIC_LOCALES) {
    urls.push(entry(locale, "/"));
    for (const page of SEO_PAGES) {
      if (LEGACY_SPORT_REDIRECTS[page.slug]) continue;
      urls.push(entry(locale, `/${page.slug}`));
    }
    for (const page of TOPIC_PAGES) urls.push(entry(locale, `/${page.slug}`));
  }
  return urls;
}

import type { MetadataRoute } from "next";
import { LEGAL_SLUGS, LEGACY_SPORT_REDIRECTS, PUBLIC_LOCALES, publicPath } from "@/app/lib/seo-slugs";
import { SEO_PAGES } from "@/app/lib/seo-landings";
import { TOPIC_PAGES } from "@/app/lib/topic-pages";
import { getIndexableSiteUrl } from "@/app/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getIndexableSiteUrl();
  const updated = new Date();
  const urls: MetadataRoute.Sitemap = [];
  for (const locale of PUBLIC_LOCALES) {
    const home = publicPath(locale, "/");
    urls.push({ url: home === "/" ? site : `${site}${home}`, lastModified: updated, changeFrequency: "weekly", priority: 1 });
    for (const slug of LEGAL_SLUGS) {
      urls.push({ url: `${site}${publicPath(locale, `/${slug}`)}`, lastModified: updated, changeFrequency: "yearly", priority: 0.3 });
    }
    for (const page of SEO_PAGES) {
      if (LEGACY_SPORT_REDIRECTS[page.slug]) continue;
      urls.push({
        url: `${site}${publicPath(locale, `/${page.slug}`)}`,
        lastModified: updated,
        changeFrequency: "monthly",
        priority: page.kind === "feature" ? 0.8 : 0.6,
      });
    }
    for (const page of TOPIC_PAGES) {
      urls.push({
        url: `${site}${publicPath(locale, `/${page.slug}`)}`,
        lastModified: updated,
        changeFrequency: "monthly",
        priority: page.slug === "cenas" ? 0.5 : 0.7,
      });
    }
  }
  return urls;
}

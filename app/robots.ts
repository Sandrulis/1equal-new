import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW_PATHS } from "@/app/lib/seo";
import { getIndexableSiteUrl } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  const url = getIndexableSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: `${url}/sitemap.xml`,
    host: new URL(url).host,
  };
}

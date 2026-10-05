import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW_PATHS } from "@/app/lib/seo";
import { indexablePublicPaths } from "@/app/lib/seo-slugs";
import { getIndexableSiteUrl } from "@/app/lib/site";

const blockedPublic = indexablePublicPaths().filter((path) =>
  ROBOTS_DISALLOW_PATHS.some((rule) => path === rule || path.startsWith(rule)),
);
if (blockedPublic.length > 0) {
  throw new Error(`robots.txt Disallow blocks a public URL: ${blockedPublic.join(", ")}`);
}

export default function robots(): MetadataRoute.Robots {
  const url = getIndexableSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: `${url}/sitemap.xml`,
  };
}

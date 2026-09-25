import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/app/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const updated = new Date("2026-09-26");
  return [
    {
      url: site,
      lastModified: updated,
      changeFrequency: "weekly",
      priority: 1,
    },
    { url: `${site}/privacy`, lastModified: updated, changeFrequency: "yearly", priority: 0.4 },
    { url: `${site}/terms`, lastModified: updated, changeFrequency: "yearly", priority: 0.4 },
    { url: `${site}/cookies`, lastModified: updated, changeFrequency: "yearly", priority: 0.4 },
  ];
}

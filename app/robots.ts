import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  const url = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/demo", "/panel", "/login", "/signup", "/forgot-password", "/reset-password", "/auth", "/api", "/v", "/cal", "/maintenance"],
    },
    sitemap: `${url}/sitemap.xml`,
    host: new URL(url).host,
  };
}

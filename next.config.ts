import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs/config";
import { canonicalHostRedirectRules, robotsNoIndexHeaderSources } from "./app/lib/seo";
import { legacyPathRedirects } from "./app/lib/seo-slugs";
import { getIndexableSiteUrl } from "./app/lib/site";

const projectRoot = dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === "production") {
  getIndexableSiteUrl();
}

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "ehl.entuziasti.com" },
    ],
  },
  async headers() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          ...(siteUrl.startsWith("https://")
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          { key: "Content-Type", value: "text/markdown; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      ...robotsNoIndexHeaderSources().map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
  async redirects() {
    return [
      ...canonicalHostRedirectRules(),
      ...legacyPathRedirects().map((rule) => ({ source: rule.source, destination: rule.destination, statusCode: 301 })),
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});

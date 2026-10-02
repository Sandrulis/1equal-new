import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs/config";

const projectRoot = dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === "production") {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  let local = !siteUrl;
  try {
    const host = new URL(siteUrl).hostname;
    local = !siteUrl || !siteUrl.startsWith("https://") || host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local") || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host === "::1";
  } catch {
    local = true;
  }
  if (local) {
    console.warn("NEXT_PUBLIC_SITE_URL is missing, local, or not https. Production metadata uses https://1equal.com.");
  }
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

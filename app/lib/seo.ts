import { getSiteUrl } from "./site";

/**
 * robots.txt Disallow values. Google matches these as prefixes.
 * Segment roots that could swallow a public slug use a trailing slash:
 * `/v` would block `/volejbola-komandas`, `/training` would block `/training-management`.
 */
export const ROBOTS_DISALLOW_PATHS = [
  "/v/",
  "/cal/",
  "/training/",
  "/join/",
  "/auth/",
  "/api/",
  "/demo",
  "/dashboard",
  "/panel",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/old-2-new",
] as const;

/** Real private route roots. Header matching is not prefix-based like robots.txt. */
const PRIVATE_HEADER_ROOTS = [
  "/dashboard",
  "/demo",
  "/panel",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api",
  "/v",
  "/cal",
  "/join",
  "/maintenance",
  "/training",
  "/old-2-new",
] as const;

/** Next.js `headers()` sources that should send `X-Robots-Tag: noindex, nofollow`. */
export function robotsNoIndexHeaderSources(): string[] {
  const sources: string[] = [];
  for (const path of PRIVATE_HEADER_ROOTS) {
    sources.push(path);
    sources.push(`${path}/:path*`);
  }
  return sources;
}

function hostnameOf(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
}

type HostRedirectRule = {
  source: string;
  has: { type: "host"; value: string }[];
  destination: string;
  permanent: true;
};

function canonicalHostFromTo(): { origin: string; fromHost: string } | null {
  const origin = getSiteUrl().replace(/\/$/, "");
  const canonicalHost = hostnameOf(origin);
  if (!canonicalHost || isLocalHost(canonicalHost)) return null;
  const fromHost = canonicalHost.startsWith("www.") ? canonicalHost.slice(4) : `www.${canonicalHost}`;
  if (!fromHost || fromHost === canonicalHost) return null;
  return { origin, fromHost };
}

/**
 * Redirects the www/apex twin to the host in NEXT_PUBLIC_SITE_URL.
 * Skipped on localhost. Do not also redirect the opposite way in Vercel, or the browser loops.
 */
export function canonicalHostRedirectRules(): HostRedirectRule[] {
  const pair = canonicalHostFromTo();
  if (!pair) return [];
  const has = [{ type: "host" as const, value: pair.fromHost }];
  return [
    {
      source: "/",
      has,
      destination: `${pair.origin}/`,
      permanent: true,
    },
    {
      source: "/:path*",
      has,
      destination: `${pair.origin}/:path*`,
      permanent: true,
    },
  ];
}

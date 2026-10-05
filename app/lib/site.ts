export const siteName = "1equal";

export const PRODUCTION_SITE_URL = "https://1equal.com";

export const siteTitle = "1Equal – komandas vadība | Kalendārs, dalība, maksājumi";

export const siteDescription =
  "Plāno spēles un treniņus, apkopo dalību un ledus vai laukuma maksu vienuviet. Hokejam, florbolam, basketbolam un volejbolam. Izmēģini demo bez konta.";

export const siteSocialDescription =
  "Spēles, treniņi, sastāvs, spēlētāju dalība un komandas izdevumi vienā platformā.";

function isLocalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
    if (host === "0.0.0.0" || host === "::" || host === "::1") return true;
    if (host.startsWith("127.")) return true;
    const parts = host.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    const [a, b] = parts;
    if (a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    return false;
  } catch {
    return true;
  }
}

let warnedAboutSiteUrl = false;

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  const production = process.env.NODE_ENV === "production";
  if (configured && !isLocalUrl(configured) && (!production || configured.startsWith("https://"))) return configured;
  if (production) {
    if (!warnedAboutSiteUrl) {
      warnedAboutSiteUrl = true;
      console.error("NEXT_PUBLIC_SITE_URL is missing, local, or not https. Production metadata uses https://1equal.com.");
    }
    return PRODUCTION_SITE_URL;
  }
  return configured || "http://localhost:3130";
}

/**
 * Canonical, Open Graph, JSON-LD, sitemap and robots.
 * Uses NEXT_PUBLIC_SITE_URL when it is a public https origin.
 * Development may be localhost. Production falls back to https://1equal.com and logs an error.
 */
export function getIndexableSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (configured && !isLocalUrl(configured) && configured.startsWith("https://")) return configured;
  if (process.env.NODE_ENV === "production") {
    if (!warnedAboutSiteUrl) {
      warnedAboutSiteUrl = true;
      console.error("NEXT_PUBLIC_SITE_URL is missing, local, or not https. Production metadata uses https://1equal.com.");
    }
    return PRODUCTION_SITE_URL;
  }
  return configured || "http://localhost:3130";
}

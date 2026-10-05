export const PUBLIC_LOCALES = ["lv", "en", "ru"] as const;

export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export const FEATURE_SLUGS = [
  "sports-team-management",
  "team-calendar",
  "training-management",
  "player-attendance",
  "team-expenses",
] as const;

export const SPORT_SLUGS = [
  "hockey-team-management",
  "football-team-management",
  "basketball-team-management",
  "floorball-team-management",
  "volleyball-team-management",
] as const;

export const TOPIC_SLUGS = [
  "hokeja-komandas",
  "florbola-komandas",
  "basketbola-komandas",
  "volejbola-komandas",
  "ledus-naudas-uzskaite",
  "cenas",
] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export const LEGAL_SLUGS = ["privacy", "terms", "cookies"] as const;

/** Older English sport URLs that now canonicalise to the Latvian topic paths. Football stays. */
export const LEGACY_SPORT_REDIRECTS: Record<string, TopicSlug> = {
  "hockey-team-management": "hokeja-komandas",
  "floorball-team-management": "florbola-komandas",
  "basketball-team-management": "basketbola-komandas",
  "volleyball-team-management": "volejbola-komandas",
};

const INDEXABLE_SLUGS = new Set<string>([...FEATURE_SLUGS, ...SPORT_SLUGS, ...TOPIC_SLUGS, ...LEGAL_SLUGS]);

/** Latvian marketing URLs have no /lv prefix. Other locales keep the prefix. */
const LV_ROOT_TAILS = new Set<string>([
  ...LEGAL_SLUGS.map((slug) => `/${slug}`),
  ...TOPIC_SLUGS.map((slug) => `/${slug}`),
]);

export function isPublicLocale(value: string): value is PublicLocale {
  return value === "lv" || value === "en" || value === "ru";
}

export function isTopicSlug(value: string): value is TopicSlug {
  return (TOPIC_SLUGS as readonly string[]).includes(value);
}

export function localeFromPathname(pathname: string): PublicLocale | null {
  const segment = pathname.split("/")[1] ?? "";
  if (segment === "en" || segment === "ru" || segment === "lv") return segment;
  if (pathname === "/" || LV_ROOT_TAILS.has(pathname)) return "lv";
  return null;
}

export function pathTail(pathname: string): string | null {
  const locale = localeFromPathname(pathname);
  if (!locale) return null;
  if (pathname === `/${locale}` || pathname === `/${locale}/`) return "/";
  if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function publicPath(locale: PublicLocale, tail: string): string {
  const normalized = !tail || tail === "/" ? "/" : tail.startsWith("/") ? tail : `/${tail}`;
  if (locale === "lv" && (normalized === "/" || LV_ROOT_TAILS.has(normalized))) return normalized;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}

export function swapLocalePath(pathname: string, next: PublicLocale): string | null {
  const tail = pathTail(pathname);
  if (tail === null) return null;
  return publicPath(next, tail);
}

export function isIndexablePublicPath(pathname: string): boolean {
  const tail = pathTail(pathname);
  if (tail === null) return false;
  if (tail === "/") return true;
  const slug = tail.replace(/^\//, "").replace(/\/$/, "");
  if (!slug || slug.includes("/")) return false;
  return INDEXABLE_SLUGS.has(slug);
}

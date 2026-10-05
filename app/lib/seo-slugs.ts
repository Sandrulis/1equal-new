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

type LocalizedGroup = {
  id: string;
  /** Latvian topic slug, when this URL serves a topic page. */
  topic: TopicSlug | null;
  /** SEO landing slug, when this URL serves that page instead of a topic. */
  seo: (typeof SPORT_SLUGS)[number] | null;
  slugs: Record<PublicLocale, string>;
  aliases: readonly string[];
};

/** One public page, with a slug in the language of /lv, /en and /ru. */
export const LOCALIZED_GROUPS: readonly LocalizedGroup[] = [
  { id: "hockey", topic: "hokeja-komandas", seo: null, slugs: { lv: "hokeja-komandas", en: "hockey-teams", ru: "hokkejnye-komandy" }, aliases: ["hockey-team-management"] },
  { id: "floorball", topic: "florbola-komandas", seo: null, slugs: { lv: "florbola-komandas", en: "floorball-teams", ru: "florbolnye-komandy" }, aliases: ["floorball-team-management"] },
  { id: "basketball", topic: "basketbola-komandas", seo: null, slugs: { lv: "basketbola-komandas", en: "basketball-teams", ru: "basketbolnye-komandy" }, aliases: ["basketball-team-management"] },
  { id: "volleyball", topic: "volejbola-komandas", seo: null, slugs: { lv: "volejbola-komandas", en: "volleyball-teams", ru: "volejbolnye-komandy" }, aliases: ["volleyball-team-management"] },
  { id: "football", topic: null, seo: "football-team-management", slugs: { lv: "futbola-komandas", en: "football-teams", ru: "futbolnye-komandy" }, aliases: ["football-team-management"] },
  { id: "ice", topic: "ledus-naudas-uzskaite", seo: null, slugs: { lv: "ledus-naudas-uzskaite", en: "ice-fee-tracking", ru: "uchet-oplaty-lda" }, aliases: [] },
  { id: "prices", topic: "cenas", seo: null, slugs: { lv: "cenas", en: "pricing", ru: "ceny" }, aliases: [] },
];

/** Older English sport URLs that now canonicalise to the language-specific sport path. */
export const LEGACY_SPORT_REDIRECTS: Record<string, TopicSlug> = {
  "hockey-team-management": "hokeja-komandas",
  "floorball-team-management": "florbola-komandas",
  "basketball-team-management": "basketbola-komandas",
  "volleyball-team-management": "volejbola-komandas",
};

const groupsBySlug = new Map<string, LocalizedGroup>();
for (const group of LOCALIZED_GROUPS) {
  for (const slug of Object.values(group.slugs)) groupsBySlug.set(slug, group);
  for (const alias of group.aliases) groupsBySlug.set(alias, group);
}

export function groupForSlug(slug: string): LocalizedGroup | null {
  return groupsBySlug.get(slug) ?? null;
}

export function localizedSlug(locale: PublicLocale, slug: string): string {
  return groupForSlug(slug)?.slugs[locale] ?? slug;
}

/** Every slug the locale routes must know, including aliases that only redirect. */
export function routableSlugs(): string[] {
  const slugs = new Set<string>([...FEATURE_SLUGS, ...SPORT_SLUGS, ...TOPIC_SLUGS]);
  for (const group of LOCALIZED_GROUPS) {
    for (const slug of Object.values(group.slugs)) slugs.add(slug);
    for (const alias of group.aliases) slugs.add(alias);
  }
  return [...slugs];
}

/** Latvian marketing URLs have no /lv prefix. Other locales keep the prefix. */
const LV_ROOT_TAILS = new Set<string>([
  ...LEGAL_SLUGS.map((slug) => `/${slug}`),
  ...LOCALIZED_GROUPS.map((group) => `/${group.slugs.lv}`),
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
  if (normalized !== "/") {
    const slug = normalized.slice(1).replace(/\/$/, "");
    const group = groupForSlug(slug);
    if (group) {
      const local = `/${group.slugs[locale]}`;
      if (locale === "lv") return local;
      return `/${locale}${local}`;
    }
  }
  if (locale === "lv" && (normalized === "/" || LV_ROOT_TAILS.has(normalized))) return normalized;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}

export function swapLocalePath(pathname: string, next: PublicLocale): string | null {
  const tail = pathTail(pathname);
  if (tail === null) return null;
  return publicPath(next, tail);
}

/** Old or wrong-language paths that must 301 to the canonical public path. */
export function legacyPathRedirects(): { source: string; destination: string }[] {
  const rules: { source: string; destination: string }[] = [{ source: "/lv", destination: "/" }];
  const seen = new Set<string>(["/lv"]);
  const add = (source: string, destination: string) => {
    if (!source || source === destination || seen.has(source)) return;
    seen.add(source);
    rules.push({ source, destination });
  };
  for (const slug of LEGAL_SLUGS) add(`/lv/${slug}`, `/${slug}`);
  for (const group of LOCALIZED_GROUPS) {
    const slugs = new Set<string>([...Object.values(group.slugs), ...group.aliases]);
    for (const slug of slugs) {
      for (const locale of PUBLIC_LOCALES) {
        const source = locale === "lv" ? `/${slug}` : `/${locale}/${slug}`;
        add(source, publicPath(locale, `/${slug}`));
      }
      add(`/lv/${slug}`, publicPath("lv", `/${slug}`));
    }
  }
  return rules;
}

export function indexablePublicPaths(): string[] {
  const tails = [
    "/",
    ...LEGAL_SLUGS.map((slug) => `/${slug}`),
    ...FEATURE_SLUGS.map((slug) => `/${slug}`),
    ...LOCALIZED_GROUPS.map((group) => `/${group.slugs.lv}`),
  ];
  return PUBLIC_LOCALES.flatMap((locale) => tails.map((tail) => publicPath(locale, tail)));
}

export function isIndexablePublicPath(pathname: string): boolean {
  const locale = localeFromPathname(pathname);
  if (!locale) return false;
  const tail = pathTail(pathname);
  if (tail === null) return false;
  if (tail === "/") return pathname === publicPath(locale, "/");
  const slug = tail.replace(/^\//, "").replace(/\/$/, "");
  if (!slug || slug.includes("/")) return false;
  const known = (FEATURE_SLUGS as readonly string[]).includes(slug) || (LEGAL_SLUGS as readonly string[]).includes(slug) || groupForSlug(slug) !== null;
  if (!known) return false;
  return pathname === publicPath(locale, `/${slug}`);
}

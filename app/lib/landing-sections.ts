import type { Lang } from "@/app/lib/messages";

export const LANDING_SECTIONS = ["content", "features", "advantages", "faq", "how", "contact"] as const;

export type LandingSection = (typeof LANDING_SECTIONS)[number];

const SLUGS: Record<Lang, Record<LandingSection, string>> = {
  lv: {
    content: "saturs",
    features: "iespejas",
    advantages: "prieksrocibas",
    faq: "jautajumi",
    how: "soli",
    contact: "kontakti",
  },
  en: {
    content: "content",
    features: "features",
    advantages: "advantages",
    faq: "faq",
    how: "how-it-works",
    contact: "contact",
  },
  ru: {
    content: "soderzhanie",
    features: "vozmozhnosti",
    advantages: "preimuschestva",
    faq: "voprosy",
    how: "kak-eto-rabotaet",
    contact: "kontakty",
  },
};

const ALIASES: Record<string, LandingSection> = {
  contacts: "contact",
};

export function landingSlug(lang: Lang, section: LandingSection): string {
  return SLUGS[lang][section];
}

export function landingSectionFromSlug(slug: string): LandingSection | null {
  const normalized = slug.trim().toLowerCase();
  if (ALIASES[normalized]) return ALIASES[normalized];
  for (const language of Object.values(SLUGS)) {
    for (const section of LANDING_SECTIONS) {
      if (language[section] === normalized) return section;
    }
  }
  return null;
}

let scrollFrame = 0;

export function scrollToLandingSection(lang: Lang, slug: string, onDone?: (id: string) => void): string | null {
  const section = landingSectionFromSlug(slug);
  const id = section ? landingSlug(lang, section) : slug;
  const target = document.getElementById(id);
  if (!target) return null;
  const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 80);
  const start = window.scrollY;
  const change = top - start;
  cancelAnimationFrame(scrollFrame);
  if (Math.abs(change) < 2) {
    window.scrollTo(0, top);
    onDone?.(id);
    return id;
  }
  const duration = Math.min(700, Math.max(320, Math.abs(change) * 0.35));
  const started = performance.now();
  function frame(now: number) {
    const progress = Math.min(1, (now - started) / duration);
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
    window.scrollTo(0, start + change * eased);
    if (progress < 1) scrollFrame = requestAnimationFrame(frame);
    else onDone?.(id);
  }
  scrollFrame = requestAnimationFrame(frame);
  return id;
}

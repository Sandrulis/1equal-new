import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { applyBrandName } from "@/app/lib/site-brand";
import { translate, type Lang, type MessageKey } from "@/app/lib/messages";
import { publicPath, type PublicLocale } from "@/app/lib/seo-slugs";

const pages = {
  privacy: { path: "/privacy", title: "legal.privacy", description: "legal.privacy.description" },
  terms: { path: "/terms", title: "legal.terms", description: "legal.terms.description" },
  cookies: { path: "/cookies", title: "legal.cookies", description: "legal.cookies.description" },
} as const satisfies Record<string, { path: string; title: MessageKey; description: MessageKey }>;

export type LegalPageId = keyof typeof pages;

export async function legalPageSeo(id: LegalPageId, lang: Lang) {
  const page = pages[id];
  const brand = await getSiteBrand();
  return {
    path: publicPath(lang as PublicLocale, page.path),
    lang,
    title: translate(lang, page.title),
    description: applyBrandName(translate(lang, page.description), brand.name),
    home: translate(lang, "nav.home"),
  };
}

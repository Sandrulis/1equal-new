import Link from "next/link";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { getSeoLanding, seoCopy } from "@/app/lib/seo-landings";
import { getTopicPage, topicCopy, type TopicPage } from "@/app/lib/topic-pages";
import { publicPath, type PublicLocale } from "@/app/lib/seo-slugs";

const CHROME = {
  home: { lv: "Sākums", en: "Home", ru: "Начало" },
  related: { lv: "Saistītās lapas", en: "Related pages", ru: "Связанные страницы" },
  signup: { lv: "Izveidot kontu", en: "Create account", ru: "Создать аккаунт" },
  demo: { lv: "Atvērt demo paneli", en: "Open the demo panel", ru: "Открыть демо-панель" },
} as const;

function relatedLabel(lang: PublicLocale, slug: string): string | null {
  const topic = getTopicPage(slug);
  if (topic) return topicCopy(lang, topic.h1);
  const page = getSeoLanding(slug);
  if (page) return seoCopy(lang, page.h1);
  return null;
}

export function TopicLanding({ lang, page }: { lang: PublicLocale; page: TopicPage }) {
  const links = page.related
    .map((slug) => {
      const label = relatedLabel(lang, slug);
      return label ? { slug, label } : null;
    })
    .filter((item): item is { slug: string; label: string } => item !== null);

  return (
    <div className="min-h-screen bg-ice text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-muted">
          <Link href={publicPath(lang, "/")} className="cursor-pointer hover:text-ink">
            {CHROME.home[lang]}
          </Link>
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">{topicCopy(lang, page.h1)}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{topicCopy(lang, page.lead)}</p>
        <div className="mt-10 grid gap-8">
          {page.sections.map((section) => (
            <section key={topicCopy(lang, section.heading)}>
              <h2 className="text-2xl font-semibold tracking-tight">{topicCopy(lang, section.heading)}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={topicCopy(lang, paragraph)} className="mt-3 leading-7 text-muted">
                  {topicCopy(lang, paragraph)}
                </p>
              ))}
            </section>
          ))}
        </div>
        <section className="mt-10" aria-labelledby="related-title">
          <h2 id="related-title" className="text-2xl font-semibold tracking-tight">
            {CHROME.related[lang]}
          </h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {links.map((item) => (
              <li key={item.slug}>
                <Link href={publicPath(lang, `/${item.slug}`)} className="cursor-pointer font-medium text-navy hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="cursor-pointer rounded-lg bg-navy px-5 py-3 text-sm font-medium text-white hover:bg-navy/90">
            {CHROME.signup[lang]}
          </Link>
          <Link href="/demo" className="cursor-pointer rounded-lg bg-paper px-5 py-3 text-sm font-medium ring-1 ring-line hover:bg-white">
            {CHROME.demo[lang]}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

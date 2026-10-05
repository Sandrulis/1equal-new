import Link from "next/link";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { getSeoLanding, SEO_CHROME, seoCopy, type SeoLandingPage } from "@/app/lib/seo-landings";
import { LEGACY_SPORT_REDIRECTS, publicPath, type PublicLocale } from "@/app/lib/seo-slugs";

export function SeoLanding({ lang, page }: { lang: PublicLocale; page: SeoLandingPage }) {
  const related = page.related
    .map((slug) => getSeoLanding(slug))
    .filter((item): item is SeoLandingPage => item !== null);

  return (
    <div className="min-h-screen bg-ice text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-muted">
          <Link href={publicPath(lang, "/")} className="cursor-pointer hover:text-ink">
            {seoCopy(lang, SEO_CHROME.home)}
          </Link>
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">{seoCopy(lang, page.h1)}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{seoCopy(lang, page.lead)}</p>
        <div className="mt-10 grid gap-8">
          {page.sections.map((section) => (
            <section key={seoCopy(lang, section.heading)}>
              <h2 className="text-2xl font-semibold tracking-tight">{seoCopy(lang, section.heading)}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={seoCopy(lang, paragraph)} className="mt-3 leading-7 text-muted">
                  {seoCopy(lang, paragraph)}
                </p>
              ))}
            </section>
          ))}
        </div>
        <section className="mt-10" aria-labelledby="related-title">
          <h2 id="related-title" className="text-2xl font-semibold tracking-tight">
            {seoCopy(lang, SEO_CHROME.related)}
          </h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={publicPath(lang, `/${LEGACY_SPORT_REDIRECTS[item.slug] ?? item.slug}`)} className="cursor-pointer font-medium text-navy hover:underline">
                  {seoCopy(lang, item.h1)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="cursor-pointer rounded-lg bg-navy px-5 py-3 text-sm font-medium text-white hover:bg-navy/90">
            {seoCopy(lang, SEO_CHROME.signup)}
          </Link>
          <Link href="/demo" className="cursor-pointer rounded-lg bg-paper px-5 py-3 text-sm font-medium ring-1 ring-line hover:bg-white">
            {seoCopy(lang, SEO_CHROME.demo)}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

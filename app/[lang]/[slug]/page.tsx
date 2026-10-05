import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SeoLanding } from "@/app/components/seo-landing";
import { TopicLanding } from "@/app/components/topic-landing";
import { getSeoLanding, seoCopy } from "@/app/lib/seo-landings";
import { translate } from "@/app/lib/messages";
import { publicPageMetadata, webPageJsonLd } from "@/app/lib/public-metadata";
import { FEATURE_SLUGS, LEGACY_SPORT_REDIRECTS, PUBLIC_LOCALES, SPORT_SLUGS, TOPIC_SLUGS, publicPath, type PublicLocale } from "@/app/lib/seo-slugs";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { getTopicPage, topicCopy } from "@/app/lib/topic-pages";

export const revalidate = 3600;

export function generateStaticParams(): { lang: PublicLocale; slug: string }[] {
  const slugs = [...FEATURE_SLUGS, ...SPORT_SLUGS, ...TOPIC_SLUGS];
  return PUBLIC_LOCALES.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export const dynamicParams = false;

function asLocale(value: string): PublicLocale | null {
  return PUBLIC_LOCALES.find((locale) => locale === value) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = asLocale(lang);
  if (!locale || LEGACY_SPORT_REDIRECTS[slug] || (locale === "lv" && getTopicPage(slug))) {
    return { robots: { index: false, follow: false } };
  }
  const topic = getTopicPage(slug);
  const page = topic ? null : getSeoLanding(slug);
  if (!topic && !page) return { robots: { index: false, follow: false } };
  const brand = await getSiteBrand();
  const path = publicPath(locale, `/${slug}`);
  return publicPageMetadata({
    locale,
    path,
    title: topic ? topicCopy(locale, topic.title) : seoCopy(locale, page!.title),
    description: topic ? topicCopy(locale, topic.description) : seoCopy(locale, page!.description),
    imageAlt: translate(locale, "landing.seo.imageAlt"),
    siteName: brand.name,
  });
}

export default async function SeoLandingRoute({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const locale = asLocale(lang);
  if (!locale) notFound();
  const legacy = LEGACY_SPORT_REDIRECTS[slug];
  if (legacy) permanentRedirect(publicPath(locale, `/${legacy}`));
  const topic = getTopicPage(slug);
  if (topic) {
    if (locale === "lv") permanentRedirect(publicPath("lv", `/${topic.slug}`));
    const title = topicCopy(locale, topic.title);
    const description = topicCopy(locale, topic.description);
    const path = publicPath(locale, `/${topic.slug}`);
    const jsonLd = webPageJsonLd({
      locale,
      path,
      title,
      description,
      crumbs: [
        { name: translate(locale, "nav.home"), path: publicPath(locale, "/") },
        { name: topicCopy(locale, topic.h1), path },
      ],
    });
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <TopicLanding lang={locale} page={topic} />
      </>
    );
  }
  const page = getSeoLanding(slug);
  if (!page) notFound();
  const title = seoCopy(locale, page.title);
  const description = seoCopy(locale, page.description);
  const path = publicPath(locale, `/${page.slug}`);
  const jsonLd = webPageJsonLd({
    locale,
    path,
    title,
    description,
    crumbs: [
      { name: translate(locale, "nav.home"), path: publicPath(locale, "/") },
      { name: seoCopy(locale, page.h1), path },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SeoLanding lang={locale} page={page} />
    </>
  );
}

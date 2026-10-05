import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicLanding } from "@/app/components/topic-landing";
import { translate } from "@/app/lib/messages";
import { publicPageMetadata, webPageJsonLd } from "@/app/lib/public-metadata";
import { publicPath, type TopicSlug } from "@/app/lib/seo-slugs";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { getTopicPage, topicCopy } from "@/app/lib/topic-pages";

export function createTopicRoute(slug: TopicSlug) {
  async function generateMetadata(): Promise<Metadata> {
    const page = getTopicPage(slug);
    if (!page) return { robots: { index: false, follow: false } };
    const brand = await getSiteBrand();
    return publicPageMetadata({
      locale: "lv",
      path: publicPath("lv", `/${page.slug}`),
      title: topicCopy("lv", page.title),
      description: topicCopy("lv", page.description),
      imageAlt: translate("lv", "landing.seo.imageAlt"),
      siteName: brand.name,
    });
  }

  async function Page() {
    const page = getTopicPage(slug);
    if (!page) notFound();
    const title = topicCopy("lv", page.title);
    const description = topicCopy("lv", page.description);
    const path = publicPath("lv", `/${page.slug}`);
    const jsonLd = webPageJsonLd({
      locale: "lv",
      path,
      title,
      description,
      crumbs: [
        { name: translate("lv", "nav.home"), path: publicPath("lv", "/") },
        { name: topicCopy("lv", page.h1), path },
      ],
    });
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <TopicLanding lang="lv" page={page} />
      </>
    );
  }

  return { generateMetadata, Page };
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLanding } from "@/app/components/seo-landing";
import { getSeoLanding, seoCopy } from "@/app/lib/seo-landings";
import { translate } from "@/app/lib/messages";
import { publicPageMetadata, webPageJsonLd } from "@/app/lib/public-metadata";
import { publicPath } from "@/app/lib/seo-slugs";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

export const revalidate = 3600;

const SLUG = "football-team-management";

export async function generateMetadata(): Promise<Metadata> {
  const page = getSeoLanding(SLUG);
  if (!page) return { robots: { index: false, follow: false } };
  const brand = await getSiteBrand();
  return publicPageMetadata({
    locale: "lv",
    path: publicPath("lv", `/${SLUG}`),
    title: seoCopy("lv", page.title),
    description: seoCopy("lv", page.description),
    imageAlt: translate("lv", "landing.seo.imageAlt"),
    siteName: brand.name,
  });
}

export default async function FootballTeamsPage() {
  const page = getSeoLanding(SLUG);
  if (!page) notFound();
  const title = seoCopy("lv", page.title);
  const description = seoCopy("lv", page.description);
  const path = publicPath("lv", `/${SLUG}`);
  const jsonLd = webPageJsonLd({
    locale: "lv",
    path,
    title,
    description,
    crumbs: [
      { name: translate("lv", "nav.home"), path: publicPath("lv", "/") },
      { name: seoCopy("lv", page.h1), path },
    ],
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SeoLanding lang="lv" page={page} />
    </>
  );
}

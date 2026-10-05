import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { LegalDocument } from "@/app/components/legal-document";
import { legalPageSeo, type LegalPageId } from "@/app/lib/legal-seo";
import { publicPageMetadata, webPageJsonLd } from "@/app/lib/public-metadata";
import { translate } from "@/app/lib/messages";
import { PUBLIC_LOCALES, publicPath, type PublicLocale } from "@/app/lib/seo-slugs";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

export const revalidate = 3600;

function asLocale(value: string): PublicLocale | null {
  return PUBLIC_LOCALES.find((locale) => locale === value) ?? null;
}

export function createLegalPage(id: LegalPageId) {
  async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params;
    const locale = asLocale(lang);
    if (!locale || locale === "lv") return { robots: { index: false, follow: false } };
    const [seo, brand] = await Promise.all([legalPageSeo(id, locale), getSiteBrand()]);
    const metadata = publicPageMetadata({
      locale,
      path: seo.path,
      title: seo.title,
      description: seo.description,
      imageAlt: translate(locale, "landing.seo.imageAlt"),
      siteName: brand.name,
    });
    return { ...metadata, title: seo.title };
  }

  async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const locale = asLocale(lang);
    if (!locale) notFound();
    if (locale === "lv") permanentRedirect(publicPath("lv", `/${id}`));
    const seo = await legalPageSeo(id, locale);
    const jsonLd = webPageJsonLd({
      locale,
      path: seo.path,
      title: seo.title,
      description: seo.description,
      crumbs: [
        { name: seo.home, path: publicPath(locale, "/") },
        { name: seo.title, path: seo.path },
      ],
    });
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <LegalDocument id={id} />
      </>
    );
  }

  return { generateMetadata, Page };
}

export function createRootLegalPage(id: LegalPageId) {
  async function generateMetadata(): Promise<Metadata> {
    const [seo, brand] = await Promise.all([legalPageSeo(id, "lv"), getSiteBrand()]);
    const metadata = publicPageMetadata({
      locale: "lv",
      path: seo.path,
      title: seo.title,
      description: seo.description,
      imageAlt: translate("lv", "landing.seo.imageAlt"),
      siteName: brand.name,
    });
    return { ...metadata, title: seo.title };
  }

  async function Page() {
    const seo = await legalPageSeo(id, "lv");
    const jsonLd = webPageJsonLd({
      locale: "lv",
      path: seo.path,
      title: seo.title,
      description: seo.description,
      crumbs: [
        { name: seo.home, path: publicPath("lv", "/") },
        { name: seo.title, path: seo.path },
      ],
    });
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <LegalDocument id={id} />
      </>
    );
  }

  return { generateMetadata, Page };
}

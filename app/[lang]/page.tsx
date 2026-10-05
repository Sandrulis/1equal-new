import type { Metadata } from "next";
import { permanentRedirect, notFound } from "next/navigation";
import { LandingHome } from "@/app/components/landing-home";
import { translate } from "@/app/lib/messages";
import { publicPageMetadata } from "@/app/lib/public-metadata";
import { PUBLIC_LOCALES, publicPath, type PublicLocale } from "@/app/lib/seo-slugs";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

export const revalidate = 3600;

export function generateStaticParams(): { lang: PublicLocale }[] {
  return PUBLIC_LOCALES.map((lang) => ({ lang }));
}

export const dynamicParams = false;

function asLocale(value: string): PublicLocale | null {
  return PUBLIC_LOCALES.find((locale) => locale === value) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = asLocale(lang);
  if (!locale || locale === "lv") return { robots: { index: false, follow: false } };
  const brand = await getSiteBrand();
  return publicPageMetadata({
    locale,
    path: publicPath(locale, "/"),
    title: translate(locale, "landing.seo.title"),
    description: translate(locale, "landing.seo.description"),
    imageAlt: translate(locale, "landing.seo.imageAlt"),
    siteName: brand.name,
  });
}

export default async function LocalizedHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = asLocale(lang);
  if (!locale) notFound();
  if (locale === "lv") permanentRedirect("/");
  return <LandingHome locale={locale} />;
}

import type { Metadata } from "next";
import { LandingHome } from "@/app/components/landing-home";
import { translate } from "@/app/lib/messages";
import { publicPageMetadata } from "@/app/lib/public-metadata";
import { publicPath } from "@/app/lib/seo-slugs";
import { getSiteBrand } from "@/app/lib/site-admin/repository";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSiteBrand();
  return publicPageMetadata({
    locale: "lv",
    path: publicPath("lv", "/"),
    title: translate("lv", "landing.seo.title"),
    description: translate("lv", "landing.seo.description"),
    imageAlt: translate("lv", "landing.seo.imageAlt"),
    siteName: brand.name,
  });
}

export default function HomePage() {
  return <LandingHome locale="lv" />;
}

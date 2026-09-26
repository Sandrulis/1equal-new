import type { MetadataRoute } from "next";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { siteDescription } from "@/app/lib/site";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getSiteBrand();
  return {
    name: brand.name,
    short_name: brand.name,
    description: siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#eef3f6",
    theme_color: "#102433",
    lang: "lv",
  };
}

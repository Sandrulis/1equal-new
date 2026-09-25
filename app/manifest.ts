import type { MetadataRoute } from "next";
import { siteDescription, siteName } from "@/app/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    description: siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#eef3f6",
    theme_color: "#102433",
    lang: "lv",
  };
}

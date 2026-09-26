import type { Metadata } from "next";
import { LegalDocument } from "@/app/components/legal-document";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { applyBrandName } from "@/app/lib/site-brand";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSiteBrand();
  return {
    title: "Sīkdatņu politika",
    description: applyBrandName("Kādas sīkdatnes 1equal lieto, cik ilgi tās glabājas un kā mainīt piekrišanu.", brand.name),
    alternates: { canonical: "/cookies" },
  };
}

export default function CookiesPage() {
  return <LegalDocument id="cookies" />;
}

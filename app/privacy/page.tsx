import type { Metadata } from "next";
import { LegalDocument } from "@/app/components/legal-document";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { applyBrandName } from "@/app/lib/site-brand";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSiteBrand();
  return {
    title: "Privātuma politika",
    description: applyBrandName("Kādus datus 1equal apstrādā un kādas ir tavas tiesības.", brand.name),
    alternates: { canonical: "/privacy" },
  };
}

export default function PrivacyPage() {
  return <LegalDocument id="privacy" />;
}

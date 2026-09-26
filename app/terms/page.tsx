import type { Metadata } from "next";
import { LegalDocument } from "@/app/components/legal-document";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { applyBrandName } from "@/app/lib/site-brand";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSiteBrand();
  return {
    title: "Lietošanas noteikumi",
    description: applyBrandName("Noteikumi 1equal demo panelim: kalendārs, sastāvs, dalība un laukumu maksa bez īsta konta.", brand.name),
    alternates: { canonical: "/terms" },
  };
}

export default function TermsPage() {
  return <LegalDocument id="terms" />;
}

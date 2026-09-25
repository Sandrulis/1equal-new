import type { Metadata } from "next";
import { LegalDocument } from "@/app/components/legal-document";

export const metadata: Metadata = {
  title: "Privātuma politika",
  description: "Kādus datus 1equal demo panelis apstrādā, cik ilgi tie paliek pārlūkā un kādas ir tavas tiesības.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalDocument id="privacy" />;
}

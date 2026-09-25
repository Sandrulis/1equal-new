import type { Metadata } from "next";
import { LegalDocument } from "@/app/components/legal-document";

export const metadata: Metadata = {
  title: "Lietošanas noteikumi",
  description: "Noteikumi 1equal demo panelim: kalendārs, sastāvs, dalība un laukumu maksa bez īsta konta.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalDocument id="terms" />;
}

import type { Metadata } from "next";
import { LegalDocument } from "@/app/components/legal-document";

export const metadata: Metadata = {
  title: "Sīkdatņu politika",
  description: "Kādas sīkdatnes 1equal lieto, cik ilgi tās glabājas un kā mainīt piekrišanu.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return <LegalDocument id="cookies" />;
}

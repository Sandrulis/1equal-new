import type { Metadata } from "next";
import { LandingPage } from "@/app/components/landing-page";
import { VoteLandingNotice } from "@/app/components/vote-landing-notice";
import { asLang, translate } from "@/app/lib/messages";
import { absolutePublicUrl } from "@/app/lib/public-metadata";
import { getPublicI18n } from "@/app/lib/site-admin/repository";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getPublicI18n();
  return {
    title: translate(asLang(i18n.defaultCode), "email.vote.thanks"),
    alternates: { canonical: absolutePublicUrl("/") },
    robots: { index: false, follow: false },
  };
}

export default async function VoteFromEmailPage({ params }: { params: Promise<{ token: string; choice: string }> }) {
  const { token, choice } = await params;
  const safeToken = /^[a-f0-9]{64}$/i.test(token) ? token.toLowerCase() : "";
  const safeChoice = choice === "going" || choice === "absent" ? choice : "";
  return (
    <VoteLandingNotice token={safeToken} choice={safeChoice}>
      <LandingPage embedded />
    </VoteLandingNotice>
  );
}

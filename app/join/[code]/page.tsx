import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinAccept, JoinChoices, JoinMissing } from "@/app/components/join-choices";
import { normalizeJoinCode } from "@/app/lib/join-invite";
import { absolutePublicUrl } from "@/app/lib/public-metadata";
import { inspectJoinLink } from "@/app/lib/team-actions";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const normalized = normalizeJoinCode(code);
  return {
    title: "Pievienoties",
    alternates: { canonical: absolutePublicUrl(normalized ? `/join/${normalized}` : "/") },
    robots: { index: false, follow: false },
  };
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeJoinCode(code);
  if (!normalized) redirect("/");
  const result = await inspectJoinLink(normalized);
  if (!result.ok) return <JoinMissing />;
  if (result.state === "ready") return <JoinAccept code={normalized} />;
  return <JoinChoices code={normalized} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinAccept, JoinChoices, JoinMissing } from "@/app/components/join-choices";
import { normalizeJoinCode } from "@/app/lib/join-invite";
import { inspectJoinLink } from "@/app/lib/team-actions";

export const metadata: Metadata = {
  title: "Pievienoties",
  robots: { index: false, follow: false },
};

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeJoinCode(code);
  if (!normalized) redirect("/");
  const result = await inspectJoinLink(normalized);
  if (!result.ok) return <JoinMissing />;
  if (result.state === "ready") return <JoinAccept code={normalized} />;
  return <JoinChoices code={normalized} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Old2NewScreen } from "@/app/components/old-2-new-screen";
import { getAccountProfile } from "@/app/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pārnešana",
  robots: { index: false, follow: false },
};

export default async function Old2NewPage() {
  const account = await getAccountProfile();
  if (!account) redirect("/login");
  if (!account.isAdmin) return <Old2NewScreen allowed={false} />;
  return <Old2NewScreen allowed />;
}

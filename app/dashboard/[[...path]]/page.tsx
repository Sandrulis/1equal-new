import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardApp } from "@/app/components/dashboard-app";
import { getAccountProfile } from "@/app/lib/auth/session";
import { parseDashboardPath } from "@/app/lib/dashboard-path";
import { loadAdminConsole } from "@/app/lib/site-admin/repository";

export const metadata: Metadata = {
  title: "Panelis",
  robots: { index: false, follow: false },
};

export default async function DashboardPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const account = await getAccountProfile();
  if (!account) redirect("/login");
  const { path } = await params;
  const route = parseDashboardPath(path);
  if (!route || (route.view === "admin" && !account.isAdmin)) redirect("/dashboard");
  const admin = account.isAdmin ? await loadAdminConsole() : null;
  return <DashboardApp basePath="/dashboard" account={account} admin={admin} />;
}

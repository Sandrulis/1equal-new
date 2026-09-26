import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardApp } from "@/app/components/dashboard-app";
import { MfaLoginGate } from "@/app/components/mfa-login-gate";
import { sessionNeedsMfaVerify } from "@/app/lib/auth/mfa";
import { getAccountProfile } from "@/app/lib/auth/session";
import { parseDashboardPath } from "@/app/lib/dashboard-path";
import { listEnabledFrontendModuleKeys, loadAdminConsole, touchUserLastSeen } from "@/app/lib/site-admin/repository";
import { listOwnedTeams } from "@/app/lib/team-membership";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panelis",
  robots: { index: false, follow: false },
};

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const account = await getAccountProfile();
  if (!account) redirect("/login");
  if (await sessionNeedsMfaVerify()) return <MfaLoginGate />;
  const { path } = await params;
  const query = await searchParams;
  const route = parseDashboardPath(path, { demoEvents: false });
  if (!route || (route.view === "admin" && !account.isAdmin)) redirect("/dashboard");
  await touchUserLastSeen(account.id);
  const [admin, initialTeams, enabledModules] = await Promise.all([
    account.isAdmin ? loadAdminConsole(account.id) : Promise.resolve(null),
    listOwnedTeams(account.id),
    listEnabledFrontendModuleKeys(),
  ]);
  return <DashboardApp basePath="/dashboard" account={account} admin={admin} initialTeams={initialTeams} openTeamId={query.team ?? null} enabledModules={enabledModules} />;
}

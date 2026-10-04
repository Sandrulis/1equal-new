import type { Metadata } from "next";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { DashboardApp } from "@/app/components/dashboard-app";
import { MfaLoginGate } from "@/app/components/mfa-login-gate";
import { sessionNeedsMfaVerify } from "@/app/lib/auth/mfa";
import { getAccountProfile } from "@/app/lib/auth/session";
import { parseDashboardPath } from "@/app/lib/dashboard-path";
import { captureRequestAddress, recordMissingTeamOrigins, recordUserOrigin } from "@/app/lib/admin-origin";
import { listEnabledFrontendModuleKeys, listIndividualFrontendModuleKeys, listSports, loadAdminConsole, touchUserLastSeen } from "@/app/lib/site-admin/repository";
import { listOwnedTeams, settleFinishedEvents } from "@/app/lib/team-membership";

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
  if (await sessionNeedsMfaVerify()) return <MfaLoginGate />;
  const account = await getAccountProfile();
  if (!account) redirect("/login");
  const { path } = await params;
  const query = await searchParams;
  const route = parseDashboardPath(path, { demoEvents: false });
  if (!route || (route.view === "admin" && !account.isAdmin)) redirect("/dashboard");
  const modulesPromise = listEnabledFrontendModuleKeys();
  const individualPromise = listIndividualFrontendModuleKeys();
  const sportsPromise = listSports();
  const initialTeams = await listOwnedTeams(account.id, account.activeTeamId);
  const ledTeamIds = initialTeams.filter((team) => team.leaderId === account.id && team.id).map((team) => team.id as string);
  const settleIds = initialTeams.some((team) => team.financeReserve) ? [] : initialTeams.filter((team) => team.id && !team.watching).map((team) => team.id as string);
  const clientAddress = await captureRequestAddress();
  after(async () => {
    await Promise.all([
      touchUserLastSeen(account.id),
      (async () => {
        await recordUserOrigin(account.id, clientAddress);
        if (ledTeamIds.length > 0) await recordMissingTeamOrigins(ledTeamIds, clientAddress);
      })(),
      settleIds.length ? settleFinishedEvents(settleIds) : Promise.resolve(),
    ]);
  });
  const [admin, enabledModules, individualModuleKeys, sports] = await Promise.all([
    account.isAdmin && route.view === "admin" ? loadAdminConsole(account.id, route.section) : Promise.resolve(null),
    modulesPromise,
    individualPromise,
    sportsPromise,
  ]);
  const teamId = route.view === "admin" && route.section === "teams" ? route.teamId ?? query.team ?? null : null;
  return <DashboardApp basePath="/dashboard" account={account} admin={admin} initialTeams={initialTeams} openTeamId={teamId} enabledModules={enabledModules} individualModuleKeys={individualModuleKeys} sports={sports} />;
}

"use client";

import { TeamDashboard } from "@/app/components/team-dashboard";
import type { AccountProfile } from "@/app/lib/auth/profile";
import type { DashboardBase } from "@/app/lib/dashboard-path";
import type { IssuedTeam } from "@/app/lib/invite-code";
import type { AdminConsole } from "@/app/lib/site-admin/types";
import type { Sport } from "@/app/lib/sports";
import { TeamCatalogProvider } from "@/app/lib/team-catalog";

export function DashboardApp({
  basePath,
  account = null,
  admin = null,
  initialTeams = [],
  openTeamId = null,
  enabledModules = null,
  sports = [],
}: {
  basePath: DashboardBase;
  account?: AccountProfile | null;
  admin?: AdminConsole | null;
  initialTeams?: IssuedTeam[];
  openTeamId?: string | null;
  enabledModules?: string[] | null;
  sports?: Sport[];
}) {
  return (
    <TeamCatalogProvider>
      <TeamDashboard basePath={basePath} account={account} admin={admin} initialTeams={initialTeams} openTeamId={openTeamId} enabledModules={enabledModules} sports={sports} />
    </TeamCatalogProvider>
  );
}

"use client";

import { TeamDashboard } from "@/app/components/team-dashboard";
import type { AccountProfile } from "@/app/lib/auth/profile";
import type { DashboardBase } from "@/app/lib/dashboard-path";
import type { AdminConsole } from "@/app/lib/site-admin/types";
import { TeamCatalogProvider } from "@/app/lib/team-catalog";

export function DashboardApp({
  basePath,
  account = null,
  admin = null,
}: {
  basePath: DashboardBase;
  account?: AccountProfile | null;
  admin?: AdminConsole | null;
}) {
  return (
    <TeamCatalogProvider>
      <TeamDashboard basePath={basePath} account={account} admin={admin} />
    </TeamCatalogProvider>
  );
}

"use client";

import { TeamDashboard } from "@/app/components/team-dashboard";
import type { DashboardBase } from "@/app/lib/dashboard-path";
import { TeamCatalogProvider } from "@/app/lib/team-catalog";

export function DashboardApp({ basePath }: { basePath: DashboardBase }) {
  return (
    <TeamCatalogProvider>
      <TeamDashboard basePath={basePath} />
    </TeamCatalogProvider>
  );
}

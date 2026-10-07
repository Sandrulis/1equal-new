"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TeamDashboard } from "@/app/components/team-dashboard";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import type { AccountProfile } from "@/app/lib/auth/profile";
import { useLanguage } from "@/app/lib/language";
import type { DashboardBase } from "@/app/lib/dashboard-path";
import type { IssuedTeam } from "@/app/lib/invite-code";
import type { AdminConsole } from "@/app/lib/site-admin/types";
import type { Sport } from "@/app/lib/sports";
import { acceptStoredJoin } from "@/app/lib/team-actions";
import type { GuestSignup } from "@/app/lib/training-guests";
import { TeamCatalogProvider } from "@/app/lib/team-catalog";

export function DashboardApp({
  basePath,
  account = null,
  admin = null,
  initialTeams = [],
  openTeamId = null,
  enabledModules = null,
  individualModuleKeys = [],
  presetEntuziasti = false,
  sports = [],
  seedDemo = false,
  accountRestored = false,
  guestSignups = [],
}: {
  basePath: DashboardBase;
  account?: AccountProfile | null;
  admin?: AdminConsole | null;
  initialTeams?: IssuedTeam[];
  openTeamId?: string | null;
  enabledModules?: string[] | null;
  individualModuleKeys?: string[];
  presetEntuziasti?: boolean;
  sports?: Sport[];
  seedDemo?: boolean;
  accountRestored?: boolean;
  guestSignups?: GuestSignup[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const restoredNoted = useRef(false);
  const joinNoted = useRef(false);
  useEffect(() => {
    if (!accountRestored || restoredNoted.current) return;
    restoredNoted.current = true;
    showFeedback({ message: t("user.delete.restored"), variant: "success" });
  }, [accountRestored, showFeedback, t]);
  useEffect(() => {
    if (!account || basePath !== "/dashboard" || joinNoted.current) return;
    joinNoted.current = true;
    void acceptStoredJoin().then((result) => {
      if (result.joined) router.refresh();
    });
  }, [account, basePath, router]);

  return (
    <TeamCatalogProvider seedDemo={seedDemo}>
      <TeamDashboard basePath={basePath} account={account} admin={admin} initialTeams={initialTeams} openTeamId={openTeamId} enabledModules={enabledModules} individualModuleKeys={individualModuleKeys} presetEntuziasti={presetEntuziasti} sports={sports} guestSignups={guestSignups} />
    </TeamCatalogProvider>
  );
}

import { cache } from "react";
import { EMPTY_USER_DISPLAY_PREFERENCES, readUserDisplayPreferences } from "@/app/lib/display-preferences";
import { readStoredEhlPlayers } from "@/app/lib/ehl-player";
import type { AccountProfile } from "@/app/lib/auth/profile";
import { getVerifiedAuth, sessionNeedsMfaVerify } from "@/app/lib/auth/mfa";
import { isSupabaseConfigured } from "@/app/lib/supabase/env";

export type { AccountProfile } from "@/app/lib/auth/profile";

export async function getCurrentUser() {
  const { user } = await getVerifiedAuth();
  return user;
}

export const getAccountProfile = cache(async (): Promise<AccountProfile | null> => {
  if (!isSupabaseConfigured()) return null;
  const { supabase, user } = await getVerifiedAuth();
  if (!supabase || !user || (await sessionNeedsMfaVerify())) return null;

  const profile = await supabase
    .from("users")
    .select("first_name, last_name, name, phone, is_admin, ehl_player, avatar_url, event_emails, week_start_day, date_format, date_separator, time_format, timezone, active_team_id")
    .eq("id", user.id)
    .maybeSingle();
  const hasPassword = user.app_metadata?.password_set !== false;
  const row = profile.data;
  if (row) {
    const storedName = typeof row.name === "string" ? row.name : "";
    return {
      id: user.id,
      email: user.email ?? "",
      phone: typeof row.phone === "string" ? row.phone : "",
      firstName: row.first_name || storedName.split(" ")[0] || "",
      lastName: row.last_name || "",
      isAdmin: row.is_admin === true,
      ehlPlayers: readStoredEhlPlayers(row.ehl_player),
      avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
      eventEmails: row.event_emails !== false,
      hasPassword,
      display: readUserDisplayPreferences(row),
      activeTeamId: typeof row.active_team_id === "string" ? row.active_team_id : null,
    };
  }

  const meta = user.user_metadata ?? {};
  const metaName = typeof meta.name === "string" ? meta.name : "";
  return {
    id: user.id,
    email: user.email ?? "",
    phone: "",
    firstName: typeof meta.first_name === "string" ? meta.first_name : metaName.split(" ")[0] || "",
    lastName: typeof meta.last_name === "string" ? meta.last_name : "",
    isAdmin: false,
    ehlPlayers: {},
    avatarUrl: null,
    eventEmails: true,
    hasPassword,
    display: EMPTY_USER_DISPLAY_PREFERENCES,
    activeTeamId: null,
  };
});

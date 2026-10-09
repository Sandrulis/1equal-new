"use server";

import { getAccountProfile } from "@/app/lib/auth/session";
import type { EhlTeamMark } from "@/app/lib/ehl-directory";
import type { MessageKey } from "@/app/lib/messages";
import { createAdminClient } from "@/app/lib/supabase/admin";

const MARKS = new Set<EhlTeamMark>(["info", "no", "yes"]);

export async function listEhlTeamMarks(): Promise<Record<string, EhlTeamMark>> {
  const account = await getAccountProfile();
  if (!account?.isAdmin) return {};
  const client = createAdminClient();
  if (!client) return {};
  const { data, error } = await client.from("ehl_team_marks").select("team_id, mark");
  if (error || !data) return {};
  const marks: Record<string, EhlTeamMark> = {};
  for (const row of data) {
    if (typeof row.team_id === "string" && isMark(row.mark)) marks[row.team_id] = row.mark;
  }
  return marks;
}

export async function setEhlTeamMark(teamId: string, mark: EhlTeamMark | null): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const account = await getAccountProfile();
  if (!account?.isAdmin) return { ok: false, error: "admin.error.forbidden" };
  if (!/^\d{1,12}$/.test(teamId) || (mark !== null && !MARKS.has(mark))) return { ok: false, error: "auth.error.generic" };
  const client = createAdminClient();
  if (!client) return { ok: false, error: "auth.error.config" };
  if (mark === null) {
    const removed = await client.from("ehl_team_marks").delete().eq("team_id", teamId);
    if (removed.error) return { ok: false, error: "auth.error.generic" };
    return { ok: true };
  }
  const saved = await client.from("ehl_team_marks").upsert({ team_id: teamId, mark, updated_at: new Date().toISOString() }, { onConflict: "team_id" });
  if (saved.error) return { ok: false, error: "auth.error.generic" };
  return { ok: true };
}

function isMark(value: unknown): value is EhlTeamMark {
  return value === "info" || value === "no" || value === "yes";
}

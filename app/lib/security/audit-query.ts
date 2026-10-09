"use server";

import { getAccountProfile } from "@/app/lib/auth/session";
import type { AuditFilterOption, AuditLogFilters, AuditLogRow } from "@/app/lib/security/audit-log-types";
import { createAdminClient } from "@/app/lib/supabase/admin";

const EMPTY = { rows: [] as AuditLogRow[], users: [] as AuditFilterOption[], teams: [] as AuditFilterOption[] };

function isoBound(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function personName(row: { name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null }): string {
  const named = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return named || row.name?.trim() || row.email?.trim() || "";
}

function detailText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const parts: string[] = [];
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (item == null || item === "" || key === "teamId") continue;
    parts.push(`${key}: ${String(item)}`);
  }
  return parts.join(", ").slice(0, 240);
}

export async function listAuditLog(filters: AuditLogFilters): Promise<typeof EMPTY> {
  const account = await getAccountProfile();
  if (!account?.isAdmin) return EMPTY;
  const admin = createAdminClient();
  if (!admin) return EMPTY;

  let query = admin
    .from("audit_log")
    .select("id, created_at, actor_id, action, entity, entity_id, team_id, status, detail")
    .order("created_at", { ascending: false })
    .limit(300);
  const from = isoBound(filters.fromIso);
  const to = isoBound(filters.toIso);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (filters.actorId && /^[0-9a-f-]{36}$/i.test(filters.actorId)) query = query.eq("actor_id", filters.actorId);
  if (filters.teamId && /^[0-9a-f-]{36}$/i.test(filters.teamId)) query = query.eq("team_id", filters.teamId);
  if (filters.status === "ok" || filters.status === "error") query = query.eq("status", filters.status);

  const [logs, users, teams] = await Promise.all([
    query,
    admin.from("users").select("id, name, first_name, last_name, email").order("email").limit(500),
    admin.from("teams").select("id, name").order("name").limit(500),
  ]);
  if (logs.error || !logs.data) return EMPTY;

  const userById = new Map((users.data ?? []).map((row) => [row.id as string, row]));
  const teamById = new Map((teams.data ?? []).map((row) => [row.id as string, String(row.name ?? "")]));
  const needle = filters.query.trim().toLocaleLowerCase("lv");
  const rows = logs.data.flatMap((row) => {
    const person = row.actor_id ? userById.get(row.actor_id) : null;
    const detail = detailText(row.detail);
    const emailFromDetail = row.detail && typeof row.detail === "object" && "email" in row.detail ? String(row.detail.email ?? "") : "";
    const actorEmail = person?.email?.trim() || emailFromDetail;
    const actorName = person ? personName(person) : "";
    const teamName = row.team_id ? teamById.get(row.team_id) ?? "" : "";
    const status = row.status === "error" ? "error" : "ok";
    const haystack = [row.action, row.entity, actorName, actorEmail, teamName, detail].join(" ").toLocaleLowerCase("lv");
    if (needle && !haystack.includes(needle)) return [];
    return [{
      id: String(row.id),
      createdAt: String(row.created_at),
      action: String(row.action),
      entity: String(row.entity),
      entityId: row.entity_id ? String(row.entity_id) : null,
      status,
      actorName,
      actorEmail,
      teamName,
      detail,
    } satisfies AuditLogRow];
  });

  return {
    rows,
    users: (users.data ?? []).map((row) => ({ id: String(row.id), label: personName(row) || String(row.email ?? "") })),
    teams: (teams.data ?? []).map((row) => ({ id: String(row.id), label: String(row.name ?? "") })),
  };
}

import { getAccountProfile } from "@/app/lib/auth/session";
import { createAdminClient } from "@/app/lib/supabase/admin";

type AuditDetail = Record<string, string | number | boolean | null>;

export async function writeAudit(
  action: string,
  entity: string,
  entityId: string | null,
  detail: AuditDetail = {},
  options?: { status?: "ok" | "error"; teamId?: string | null; actorId?: string | null },
) {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    const account = options && "actorId" in options ? null : await getAccountProfile();
    const actorId = options && "actorId" in options ? options.actorId ?? null : account?.id ?? null;
    const teamFromDetail = typeof detail.teamId === "string" ? detail.teamId : null;
    const teamId = options?.teamId ?? teamFromDetail;
    await admin.from("audit_log").insert({
      actor_id: actorId,
      action: action.slice(0, 80),
      entity: entity.slice(0, 80),
      entity_id: entityId ? entityId.slice(0, 80) : null,
      team_id: teamId && /^[0-9a-f-]{36}$/i.test(teamId) ? teamId : null,
      status: options?.status === "error" ? "error" : "ok",
      detail,
    });
  } catch {
    return;
  }
}

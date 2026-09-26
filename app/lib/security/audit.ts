import { getAccountProfile } from "@/app/lib/auth/session";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function writeAudit(action: string, entity: string, entityId: string | null, detail: Record<string, string | number | boolean | null> = {}) {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    const account = await getAccountProfile();
    await admin.from("audit_log").insert({
      actor_id: account?.id ?? null,
      action,
      entity,
      entity_id: entityId,
      detail,
    });
  } catch {
    return;
  }
}

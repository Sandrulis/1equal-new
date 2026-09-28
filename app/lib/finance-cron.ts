import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/app/lib/site";
import { createAdminClient } from "@/app/lib/supabase/admin";

const JOB_KEY = "finance";

export type FinanceCronSettings = {
  enabled: boolean;
  url: string;
};

function sameToken(stored: string, given: string): boolean {
  if (!given || given.length > 200) return false;
  const left = createHash("sha256").update(stored).digest();
  const right = createHash("sha256").update(given).digest();
  return timingSafeEqual(left, right);
}

export async function readFinanceCron(client: SupabaseClient): Promise<FinanceCronSettings | null> {
  const row = await client.from("cron_jobs").select("enabled, token").eq("job_key", JOB_KEY).maybeSingle();
  if (row.error || !row.data || typeof row.data.token !== "string") return null;
  const url = `${getSiteUrl()}/api/cron/finance?token=${encodeURIComponent(row.data.token)}`;
  return { enabled: row.data.enabled === true, url };
}

export async function writeFinanceCron(client: SupabaseClient, enabled: boolean): Promise<boolean> {
  const saved = await client.from("cron_jobs").update({ enabled, updated_at: new Date().toISOString() }).eq("job_key", JOB_KEY);
  if (saved.error) return false;
  if (!enabled) {
    const settled = await client.rpc("settle_finance_reservations", { only_started: false });
    if (settled.error) return false;
  }
  return true;
}

export async function runFinanceCron(token: string): Promise<{ ok: true; enabled: boolean; charged: number } | { ok: false }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false };
  const row = await admin.from("cron_jobs").select("enabled, token").eq("job_key", JOB_KEY).maybeSingle();
  if (row.error || !row.data || typeof row.data.token !== "string" || !sameToken(row.data.token, token)) return { ok: false };
  if (row.data.enabled !== true) return { ok: true, enabled: false, charged: 0 };
  const settled = await admin.rpc("settle_finance_reservations", { only_started: true });
  if (settled.error) return { ok: false };
  const charged = typeof settled.data === "number" ? settled.data : Number(settled.data ?? 0);
  return { ok: true, enabled: true, charged: Number.isFinite(charged) ? charged : 0 };
}

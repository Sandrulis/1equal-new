"use server";

import { getAccountProfile } from "@/app/lib/auth/session";
import { rateLimit } from "@/app/lib/security/rate-limit";
import { createAdminClient } from "@/app/lib/supabase/admin";

const TOKEN = /^[A-Za-z0-9:_\-.]{32,4096}$/;

export async function savePushDevice(token: string): Promise<{ ok: true } | { ok: false }> {
  const value = token.trim();
  if (!TOKEN.test(value)) return { ok: false };
  const account = await getAccountProfile();
  if (!account) return { ok: false };
  if (await rateLimit(`push-device:${account.id}`, 30, 10 * 60 * 1000)) return { ok: false };
  const admin = createAdminClient();
  if (!admin) return { ok: false };
  const saved = await admin.from("push_devices").upsert(
    { token: value, user_id: account.id, platform: "android", updated_at: new Date().toISOString() },
    { onConflict: "token" },
  );
  return saved.error ? { ok: false } : { ok: true };
}

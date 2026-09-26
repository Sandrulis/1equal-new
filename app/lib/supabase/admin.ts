import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

export function createAdminClient() {
  const env = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!env || !serviceRoleKey || serviceRoleKey.includes("your_service")) return null;

  return createClient(env.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

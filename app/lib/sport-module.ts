import type { SupabaseClient } from "@supabase/supabase-js";
import { KNOWN_FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import { listFrontendModules } from "@/app/lib/site-admin/repository";

export async function moduleEnabledForSport(client: SupabaseClient, sportId: string | null | undefined, key: string, teamId?: string | null): Promise<boolean> {
  const modules = await listFrontendModules();
  const found = modules?.find((item) => item.moduleKey === key);
  if (!modules) {
    if (!(KNOWN_FRONTEND_MODULE_KEYS as readonly string[]).includes(key)) return false;
  } else if (!found?.isEnabled) {
    return false;
  }
  if (found?.isIndividual) {
    if (!teamId) return false;
    const teamLink = await client.from("team_modules").select("module_key").eq("team_id", teamId).eq("module_key", key).maybeSingle();
    return !teamLink.error && Boolean(teamLink.data);
  }
  if (!sportId) return true;
  const link = await client.from("sport_modules").select("module_key").eq("sport_id", sportId).eq("module_key", key).maybeSingle();
  if (link.error) return false;
  return Boolean(link.data);
}

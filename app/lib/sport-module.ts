import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { KNOWN_FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import { listFrontendModules, listSportModuleLinks, listTeamModuleLinks } from "@/app/lib/site-admin/repository";

const moduleOnForSport = cache(async (sportId: string | null, key: string, teamId: string | null): Promise<boolean> => {
  const modules = await listFrontendModules();
  const found = modules?.find((item) => item.moduleKey === key);
  if (!modules) {
    if (!(KNOWN_FRONTEND_MODULE_KEYS as readonly string[]).includes(key)) return false;
  } else if (!found?.isEnabled) {
    return false;
  }
  if (found?.isIndividual) {
    if (!teamId) return false;
    const links = await listTeamModuleLinks();
    return links.some((link) => link.teamId === teamId && link.moduleKey === key);
  }
  if (!sportId) return true;
  const links = await listSportModuleLinks();
  return links.some((link) => link.sportId === sportId && link.moduleKey === key);
});

export function moduleEnabledForSport(_client: SupabaseClient, sportId: string | null | undefined, key: string, teamId?: string | null): Promise<boolean> {
  return moduleOnForSport(sportId ?? null, key, teamId ?? null);
}

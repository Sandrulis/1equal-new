import type { SupabaseClient } from "@supabase/supabase-js";

export function isMaintenanceOpenPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/maintenance") return true;
  if (pathname === "/auth/callback" || pathname === "/auth/google/sign-in") return true;
  if (pathname === "/auth/confirm-email" || pathname === "/auth/confirm-delete") return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/api/i18n/")) return true;
  return false;
}

export async function siteMaintenanceOn(client: SupabaseClient): Promise<boolean> {
  const row = await client.from("site_settings").select("maintenance").eq("id", 1).maybeSingle();
  if (row.error) return false;
  return row.data?.maintenance === true;
}

import type { AccountProfile } from "@/app/lib/auth/profile";
import { isSupabaseConfigured } from "@/app/lib/supabase/env";
import { createClient } from "@/app/lib/supabase/server";

export type { AccountProfile } from "@/app/lib/auth/profile";

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getAccountProfile(): Promise<AccountProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const profile = await supabase.from("users").select("first_name, last_name, name, is_admin").eq("id", user.id).maybeSingle();
  const row = profile.data;
  if (row) {
    const storedName = typeof row.name === "string" ? row.name : "";
    return {
      firstName: row.first_name || storedName.split(" ")[0] || "",
      lastName: row.last_name || "",
      isAdmin: row.is_admin === true,
    };
  }

  const meta = user.user_metadata ?? {};
  const metaName = typeof meta.name === "string" ? meta.name : "";
  return {
    firstName: typeof meta.first_name === "string" ? meta.first_name : metaName.split(" ")[0] || "",
    lastName: typeof meta.last_name === "string" ? meta.last_name : "",
    isAdmin: false,
  };
}

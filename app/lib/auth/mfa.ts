import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/app/lib/supabase/env";
import { createClient } from "@/app/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const getVerifiedAuth = cache(async (): Promise<{ supabase: ServerClient | null; user: User | null }> => {
  if (!isSupabaseConfigured()) return { supabase: null, user: null };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
});

function tokenAal(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { aal?: unknown };
    return typeof json.aal === "string" ? json.aal : null;
  } catch {
    return null;
  }
}

export function needsMfaChallenge(user: User, accessToken: string | null | undefined): boolean {
  const verified = user.factors?.some((factor) => factor.status === "verified") ?? false;
  if (!verified) return false;
  return tokenAal(accessToken ?? "") !== "aal2";
}

export const sessionNeedsMfaVerify = cache(async (): Promise<boolean> => {
  const { supabase, user } = await getVerifiedAuth();
  if (!supabase || !user) return false;
  const { data } = await supabase.auth.getSession();
  return needsMfaChallenge(user, data.session?.access_token);
});

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { parseSessionPersistence, REMEMBER_SESSION_COOKIE, withAuthCookieOptions, type SessionPersistence } from "@/app/lib/auth/remember-session";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

export async function createClient(persistence?: SessionPersistence) {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error("Supabase env is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();
  const persist = persistence ?? parseSessionPersistence(cookieStore.get(REMEMBER_SESSION_COOKIE)?.value);

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          withAuthCookieOptions(cookiesToSet, persist).forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component. The proxy refreshes the session.
        }
      },
    },
  });
}

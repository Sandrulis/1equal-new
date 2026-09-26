"use client";

import { createBrowserClient } from "@supabase/ssr";
import { parseRememberSession, REMEMBER_SESSION_COOKIE, serializeBrowserAuthCookie, withAuthCookieOptions } from "@/app/lib/auth/remember-session";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

function readDocumentCookies() {
  if (typeof document === "undefined" || !document.cookie) return [];
  return document.cookie.split("; ").flatMap((part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return [];
    try {
      return [{ name: decodeURIComponent(part.slice(0, separator)), value: decodeURIComponent(part.slice(separator + 1)) }];
    } catch {
      return [{ name: part.slice(0, separator), value: part.slice(separator + 1) }];
    }
  });
}

export function createBrowserSupabase() {
  const env = getSupabasePublicEnv();
  if (!env) throw new Error("Supabase env is missing.");
  return createBrowserClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return readDocumentCookies();
      },
      setAll(cookiesToSet) {
        const remember = parseRememberSession(readDocumentCookies().find((cookie) => cookie.name === REMEMBER_SESSION_COOKIE)?.value);
        const secure = typeof window !== "undefined" && window.location.protocol === "https:";
        withAuthCookieOptions(cookiesToSet, remember).forEach(({ name, value, options }) => {
          serializeBrowserAuthCookie(name, value, { ...options, secure: options?.secure ?? secure });
        });
      },
    },
  });
}

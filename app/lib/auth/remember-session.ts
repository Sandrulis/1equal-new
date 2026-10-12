import type { CookieOptions } from "@supabase/ssr";

export const REMEMBER_SESSION_COOKIE = "1equal-remember-session";

export const AUTH_SESSION_MAX_AGE_DAYS = 30;
export const AUTH_SESSION_MAX_AGE = AUTH_SESSION_MAX_AGE_DAYS * 24 * 60 * 60;
export const APP_SESSION_MAX_AGE_DAYS = 400;
export const APP_SESSION_MAX_AGE = APP_SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

export type SessionPersistence = "session" | "remember" | "app";

type AuthCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function parseSessionPersistence(raw: string | null | undefined): SessionPersistence {
  if (raw === "app") return "app";
  if (raw === "1" || raw === "true") return "remember";
  return "session";
}

export function parseRememberSession(raw: string | null | undefined): boolean {
  return parseSessionPersistence(raw) !== "session";
}

export function sessionCookieValue(persistence: SessionPersistence): string {
  if (persistence === "app") return "app";
  if (persistence === "remember") return "1";
  return "";
}

function persistenceMaxAge(persistence: SessionPersistence): number | null {
  if (persistence === "app") return APP_SESSION_MAX_AGE;
  if (persistence === "remember") return AUTH_SESSION_MAX_AGE;
  return null;
}

function secureCookie() {
  return process.env.NODE_ENV === "production" || (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
}

export function rememberPreferenceOptions(persistence: SessionPersistence): CookieOptions {
  const maxAge = persistenceMaxAge(persistence);
  if (maxAge == null) {
    return { path: "/", sameSite: "lax", secure: secureCookie(), httpOnly: false, maxAge: 0, expires: new Date(0) };
  }
  return {
    path: "/",
    sameSite: "lax",
    secure: secureCookie(),
    httpOnly: false,
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  };
}

export function mergeAuthCookieOptions(options: CookieOptions | undefined, persistence: SessionPersistence): CookieOptions {
  const deleting = options?.maxAge === 0;
  const merged: CookieOptions = {
    ...options,
    path: options?.path ?? "/",
    sameSite: options?.sameSite ?? "lax",
  };

  if (deleting) {
    merged.maxAge = 0;
    merged.expires = new Date(0);
    return merged;
  }

  const maxAge = persistenceMaxAge(persistence);
  if (maxAge == null) {
    delete merged.maxAge;
    delete merged.expires;
    return merged;
  }

  merged.maxAge = maxAge;
  merged.expires = new Date(Date.now() + maxAge * 1000);
  return merged;
}

export function withAuthCookieOptions(cookiesToSet: AuthCookie[], persistence: SessionPersistence): AuthCookie[] {
  return cookiesToSet.map((cookie) => ({
    ...cookie,
    options: mergeAuthCookieOptions(cookie.options, persistence),
  }));
}

export function serializeBrowserAuthCookie(name: string, value: string, options: CookieOptions | undefined) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, `Path=${options?.path ?? "/"}`];
  if (typeof options?.maxAge === "number") parts.push(`Max-Age=${options.maxAge}`);
  if (options?.expires instanceof Date) parts.push(`Expires=${options.expires.toUTCString()}`);
  const sameSite = options?.sameSite ?? "lax";
  parts.push(`SameSite=${sameSite === "none" ? "None" : sameSite === "strict" ? "Strict" : "Lax"}`);
  if (options?.secure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

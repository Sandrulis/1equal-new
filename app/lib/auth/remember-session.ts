import type { CookieOptions } from "@supabase/ssr";

export const REMEMBER_SESSION_COOKIE = "1equal-remember-session";

export const AUTH_SESSION_MAX_AGE_DAYS = 30;
export const AUTH_SESSION_MAX_AGE = AUTH_SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

type AuthCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function parseRememberSession(raw: string | null | undefined): boolean {
  return raw === "1" || raw === "true";
}

export function rememberPreferenceOptions(remember: boolean): CookieOptions {
  const secure = process.env.NODE_ENV === "production" || (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  if (!remember) {
    return { path: "/", sameSite: "lax", secure, httpOnly: false, maxAge: 0, expires: new Date(0) };
  }
  return {
    path: "/",
    sameSite: "lax",
    secure,
    httpOnly: false,
    maxAge: AUTH_SESSION_MAX_AGE,
    expires: new Date(Date.now() + AUTH_SESSION_MAX_AGE * 1000),
  };
}

export function mergeAuthCookieOptions(options: CookieOptions | undefined, remember: boolean): CookieOptions {
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

  if (remember) {
    merged.maxAge = AUTH_SESSION_MAX_AGE;
    merged.expires = new Date(Date.now() + AUTH_SESSION_MAX_AGE * 1000);
    return merged;
  }

  delete merged.maxAge;
  delete merged.expires;
  return merged;
}

export function withAuthCookieOptions(cookiesToSet: AuthCookie[], remember: boolean): AuthCookie[] {
  return cookiesToSet.map((cookie) => ({
    ...cookie,
    options: mergeAuthCookieOptions(cookie.options, remember),
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

import { createServerClient } from "@supabase/ssr";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { settleAccountDeletionOnSignIn, withAccountRestoredCookie } from "@/app/lib/auth/account-deletion";
import { siteMaintenanceOn } from "@/app/lib/maintenance";
import { safeTrainingPath } from "@/app/lib/safe-next";
import { REMEMBER_SESSION_COOKIE, rememberPreferenceOptions, withAuthCookieOptions } from "@/app/lib/auth/remember-session";
import { openIntegrationSecret } from "@/app/lib/security/integration-secret";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

export const GOOGLE_OAUTH_COOKIE = "1equal-google-oauth";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

type GoogleCredentials = { clientId: string; clientSecret: string };

type GoogleProfile = {
  email: string;
  firstName: string;
  lastName: string;
};

export type GoogleOAuthState = {
  nonce: string;
  remember: boolean;
  from: "login" | "signup";
  next: string | null;
};

function secureCookie() {
  return process.env.NODE_ENV === "production" || (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
}

export function googleOAuthCookieOptions(maxAge: number) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    maxAge,
  };
}

export async function readGoogleOAuthCredentials(): Promise<GoogleCredentials | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("site_integrations")
    .select("client_id, client_secret, is_enabled, is_configured")
    .eq("integration_key", "google_oauth")
    .maybeSingle();
  const clientId = data?.client_id?.trim() ?? "";
  const clientSecret = openIntegrationSecret(data?.client_secret);
  if (!data?.is_enabled || !data.is_configured || !clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function isGoogleSignInEnabled() {
  return (await readGoogleOAuthCredentials()) !== null;
}

export function createGoogleOAuthState(remember: boolean, from: "login" | "signup", next: string | null = null): GoogleOAuthState {
  return { nonce: randomBytes(16).toString("hex"), remember, from, next };
}

export function serializeGoogleOAuthState(state: GoogleOAuthState) {
  const base = `v1.${state.nonce}.${state.remember ? "1" : "0"}.${state.from}`;
  return state.next ? `${base}.${encodeURIComponent(state.next)}` : base;
}

export function parseGoogleOAuthState(raw: string | null | undefined): GoogleOAuthState | null {
  if (!raw) return null;
  const [version, nonce, remember, from, encoded] = raw.split(".");
  if (version !== "v1" || !nonce || nonce.length !== 32) return null;
  if (remember !== "0" && remember !== "1") return null;
  if (from !== "login" && from !== "signup") return null;
  const next = encoded ? safeTrainingPath(decodeURIComponent(encoded)) : null;
  return { nonce, remember: remember === "1", from, next };
}

function sameNonce(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function googleOAuthStatesMatch(cookie: GoogleOAuthState | null, stateParam: string | null) {
  if (!cookie || !stateParam) return false;
  return sameNonce(cookie.nonce, stateParam);
}

export function googleRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

export async function buildGoogleAuthorizeUrl(origin: string, nonce: string) {
  const credentials = await readGoogleOAuthCredentials();
  if (!credentials) return null;
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state: nonce,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCode(origin: string, code: string) {
  const credentials = await readGoogleOAuthCredentials();
  if (!credentials) return null;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { access_token?: string } | null;
  if (!response.ok || !payload?.access_token) return null;
  return payload.access_token;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

async function fetchProfile(accessToken: string): Promise<GoogleProfile | null> {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as {
    email?: string;
    verified_email?: boolean;
    given_name?: string;
    family_name?: string;
    name?: string;
  } | null;
  const email = payload?.email?.trim().toLowerCase() ?? "";
  if (!email || payload?.verified_email === false) return null;
  const fallback = splitName(payload?.name ?? "");
  const firstName = payload?.given_name?.trim() || fallback.firstName || email.split("@")[0] || "User";
  const lastName = payload?.family_name?.trim() || fallback.lastName;
  return { email, firstName, lastName };
}

function userAlreadyExists(message: string) {
  const text = message.toLowerCase();
  return text.includes("already") || text.includes("registered") || text.includes("exists");
}

function readRequestCookies(request: Request) {
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => {
      const index = part.indexOf("=");
      if (index <= 0) return null;
      return {
        name: decodeURIComponent(part.slice(0, index).trim()),
        value: decodeURIComponent(part.slice(index + 1).trim()),
      };
    })
    .filter((cookie): cookie is { name: string; value: string } => cookie !== null);
}

function authErrorPath(from: "login" | "signup") {
  return from === "signup" ? "/signup?error=google" : "/login?error=google";
}

export async function completeGoogleSignIn(request: Request, origin: string, code: string, state: GoogleOAuthState) {
  const fail = () => clearGoogleOAuthCookie(NextResponse.redirect(`${origin}${authErrorPath(state.from)}`));
  const admin = createAdminClient();
  const env = getSupabasePublicEnv();
  if (!admin || !env) return fail();

  const accessToken = await exchangeCode(origin, code);
  if (!accessToken) return fail();
  const profile = await fetchProfile(accessToken);
  if (!profile) return fail();
  if (await siteMaintenanceOn(admin)) {
    const email = profile.email.replaceAll("%", "\\%").replaceAll("_", "\\_");
    const person = await admin.from("users").select("is_admin").ilike("email", email).maybeSingle();
    if (person.data?.is_admin !== true) return clearGoogleOAuthCookie(NextResponse.redirect(`${origin}/login?error=maintenance`));
  }

  const created = await admin.auth.admin.createUser({
    email: profile.email,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    app_metadata: { password_set: false },
    user_metadata: {
      first_name: profile.firstName,
      last_name: profile.lastName,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
    },
  });

  let userId = created.data.user?.id ?? "";
  if (!userId) {
    if (!created.error || !userAlreadyExists(created.error.message)) return fail();
    const existing = await admin.auth.admin.generateLink({ type: "magiclink", email: profile.email });
    userId = existing.data.user?.id ?? "";
    if (!userId) return fail();
  }

  const profileError = await admin.rpc("ensure_user_profile", {
    user_id: userId,
    user_email: profile.email,
    user_first_name: profile.firstName,
    user_last_name: profile.lastName,
  });
  if (profileError.error && created.data.user) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return fail();
  }

  const authUser = await admin.auth.admin.getUserById(userId);
  const meta = authUser.data.user?.app_metadata ?? {};
  if (meta.password_set !== true) {
    const marked = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...meta, password_set: false } });
    if (marked.error) return fail();
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: profile.email });
  const tokenHash = link.data?.properties?.hashed_token?.trim() ?? "";
  if (link.error || !tokenHash) return fail();

  const redirectResponse = NextResponse.redirect(`${origin}${state.next ?? "/dashboard"}`);
  redirectResponse.cookies.set(REMEMBER_SESSION_COOKIE, state.remember ? "1" : "", rememberPreferenceOptions(state.remember));
  const requestCookies = readRequestCookies(request);
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return requestCookies;
      },
      setAll(cookiesToSet) {
        withAuthCookieOptions(cookiesToSet, state.remember).forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, {
            path: options?.path,
            maxAge: options?.maxAge,
            expires: options?.expires,
            httpOnly: options?.httpOnly,
            secure: options?.secure,
            sameSite: options?.sameSite === "none" || options?.sameSite === "strict" ? options.sameSite : "lax",
          });
        });
      },
    },
  });
  const verified = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (verified.error) return fail();
  const settlement = await settleAccountDeletionOnSignIn(userId);
  if (settlement === "deleted") {
    await supabase.auth.signOut();
    redirectResponse.headers.set("location", `${origin}/login?error=deleted`);
    return clearGoogleOAuthCookie(redirectResponse);
  }
  if (settlement === "restored") withAccountRestoredCookie(redirectResponse);
  return clearGoogleOAuthCookie(redirectResponse);
}

export function clearGoogleOAuthCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", { ...googleOAuthCookieOptions(0), maxAge: 0 });
  return response;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseRememberSession, REMEMBER_SESSION_COOKIE, withAuthCookieOptions } from "@/app/lib/auth/remember-session";
import { getSupabasePublicEnv } from "@/app/lib/supabase/env";

function contentSecurityPolicy(): { nonce: string; policy: string } {
  const nonce = btoa(crypto.randomUUID());
  const devEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval} https://challenges.cloudflare.com https://cloud.umami.is`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloud.umami.is https://gateway.umami.is https://*.sentry.io https://*.ingest.sentry.io https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  return { nonce, policy };
}

function nextWithPolicy(requestHeaders: Headers, policy: string) {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export async function updateSession(request: NextRequest) {
  const { nonce, policy } = contentSecurityPolicy();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const env = getSupabasePublicEnv();
  if (!env) return nextWithPolicy(requestHeaders, policy);

  const { pathname } = request.nextUrl;
  const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.includes("-auth-token"));
  const isPublic =
    pathname === "/" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/cookies" ||
    pathname === "/demo" ||
    pathname.startsWith("/demo/");
  if (!hasAuthCookie && isPublic) return nextWithPolicy(requestHeaders, policy);

  let supabaseResponse = nextWithPolicy(requestHeaders, policy);
  const remember = parseRememberSession(request.cookies.get(REMEMBER_SESSION_COOKIE)?.value);
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        const nextCookies = withAuthCookieOptions(cookiesToSet, remember);
        nextCookies.forEach(({ name, value }) => request.cookies.set(name, value));
        const cookie = request.cookies.getAll().map((item) => `${item.name}=${item.value}`).join("; ");
        if (cookie) requestHeaders.set("cookie", cookie);
        supabaseResponse = nextWithPolicy(requestHeaders, policy);
        nextCookies.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAuthForm = pathname === "/login" || pathname === "/signup";

  if (!user && isDashboard) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("Content-Security-Policy", policy);
    return redirect;
  }

  if (user && isAuthForm) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/dashboard";
    homeUrl.search = "";
    const redirect = NextResponse.redirect(homeUrl);
    redirect.headers.set("Content-Security-Policy", policy);
    return redirect;
  }

  supabaseResponse.headers.set("Content-Security-Policy", policy);
  return supabaseResponse;
}

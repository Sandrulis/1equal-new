import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseRememberSession, REMEMBER_SESSION_COOKIE, withAuthCookieOptions } from "@/app/lib/auth/remember-session";
import { JOIN_INVITE_COOKIE, joinInviteCookieOptions, normalizeJoinCode } from "@/app/lib/join-invite";
import { isMaintenanceOpenPath, siteMaintenanceOn } from "@/app/lib/maintenance";
import { isIndexablePublicPath } from "@/app/lib/seo-slugs";
import { safeTrainingPath } from "@/app/lib/safe-next";
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

function redirectWithCookies(request: NextRequest, pathname: string, policy: string, source: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  redirect.headers.set("Content-Security-Policy", policy);
  for (const cookie of source.headers.getSetCookie()) redirect.headers.append("set-cookie", cookie);
  return redirect;
}

function maintenanceDenied(request: NextRequest, pathname: string, policy: string, source: NextResponse) {
  if (pathname.startsWith("/api/")) {
    const denied = NextResponse.json({ error: "maintenance" }, { status: 503 });
    denied.headers.set("Content-Security-Policy", policy);
    for (const cookie of source.headers.getSetCookie()) denied.headers.append("set-cookie", cookie);
    return denied;
  }
  return redirectWithCookies(request, "/maintenance", policy, source);
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
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

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
    pathname.startsWith("/demo/") ||
    isIndexablePublicPath(pathname);

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

  const maintenancePromise = siteMaintenanceOn(supabase);
  if (!hasAuthCookie && isPublic) {
    const maintenance = await maintenancePromise;
    if (!maintenance) return nextWithPolicy(requestHeaders, policy);
    if (pathname === "/maintenance") return redirectWithCookies(request, "/", policy, supabaseResponse);
  }

  const [maintenance, userResult] = await Promise.all([maintenancePromise, supabase.auth.getUser()]);
  if (!maintenance && pathname === "/maintenance") return redirectWithCookies(request, "/", policy, supabaseResponse);
  const user = userResult.data.user;
  let activeUser = user;

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isHome = pathname === "/";
  const isAuthForm = pathname === "/login" || pathname === "/signup";
  const signInPost = request.method === "POST" && (isAuthForm || pathname.startsWith("/auth/"));

  if (maintenance) {
    const adminRow = activeUser ? await supabase.from("users").select("is_admin").eq("id", activeUser.id).maybeSingle() : null;
    const admin = adminRow?.data?.is_admin === true;
    if (admin && pathname === "/maintenance") return redirectWithCookies(request, "/dashboard", policy, supabaseResponse);
    if (!admin) {
      if (activeUser && !signInPost) {
        await supabase.auth.signOut();
        activeUser = null;
      }
      if (!isMaintenanceOpenPath(pathname)) return maintenanceDenied(request, pathname, policy, supabaseResponse);
    }
  }

  if (activeUser && !signInPost) {
    const marked = await supabase.from("users").select("deletion_due_at").eq("id", activeUser.id).maybeSingle();
    const dueAt = marked.data?.deletion_due_at;
    if (!marked.error && typeof dueAt === "string" && dueAt) {
      await supabase.auth.signOut();
      if (isAuthForm) {
        supabaseResponse.headers.set("Content-Security-Policy", policy);
        return supabaseResponse;
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      const redirect = NextResponse.redirect(loginUrl);
      redirect.headers.set("Content-Security-Policy", policy);
      const setCookies = supabaseResponse.headers.getSetCookie();
      for (const cookie of setCookies) redirect.headers.append("set-cookie", cookie);
      return redirect;
    }
  }

  if (!activeUser && isDashboard) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("Content-Security-Policy", policy);
    return redirect;
  }

  if (activeUser && (isAuthForm || isHome)) {
    const homeUrl = request.nextUrl.clone();
    const next = isAuthForm ? safeTrainingPath(request.nextUrl.searchParams.get("next")) : null;
    homeUrl.pathname = next ?? "/dashboard";
    homeUrl.search = "";
    const redirect = NextResponse.redirect(homeUrl);
    redirect.headers.set("Content-Security-Policy", policy);
    return redirect;
  }

  const joinCode = normalizeJoinCode(/^\/join\/([A-Z0-9]{4,16})$/i.exec(pathname)?.[1]);
  if (joinCode && !activeUser) supabaseResponse.cookies.set(JOIN_INVITE_COOKIE, joinCode, joinInviteCookieOptions());

  supabaseResponse.headers.set("Content-Security-Policy", policy);
  return supabaseResponse;
}

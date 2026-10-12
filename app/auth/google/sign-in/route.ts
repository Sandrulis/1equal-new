import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE,
  buildGoogleAuthorizeUrl,
  createGoogleOAuthState,
  googleOAuthCookieOptions,
  isGoogleSignInEnabled,
  serializeGoogleOAuthState,
} from "@/app/lib/auth/google-oauth";
import { isNativeAppRequest } from "@/app/lib/native-app";
import { publicRequestOrigin } from "@/app/lib/public-origin";
import { safeTrainingPath } from "@/app/lib/safe-next";
import { requireTurnstileToken } from "@/app/lib/security/turnstile";
import type { SessionPersistence } from "@/app/lib/auth/remember-session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicRequestOrigin(request);
  const from = searchParams.get("from") === "signup" ? "signup" : "login";
  const back = from === "signup" ? "/signup" : "/login";

  if (!(await isGoogleSignInEnabled())) {
    return NextResponse.redirect(`${origin}${back}?error=google`);
  }

  const turnstile = await requireTurnstileToken(searchParams.get("turnstile"));
  if (!turnstile.ok) {
    const error = turnstile.error === "auth.turnstile.required" ? "turnstile_required" : "turnstile";
    return NextResponse.redirect(`${origin}${back}?error=${error}`);
  }

  const inApp = await isNativeAppRequest();
  const native = searchParams.get("client") === "app" && inApp;
  const persistence: SessionPersistence = inApp ? "app" : searchParams.get("remember") === "1" ? "remember" : "session";
  const state = createGoogleOAuthState(persistence !== "session", from, safeTrainingPath(searchParams.get("next")), persistence);
  const url = await buildGoogleAuthorizeUrl(origin, state.nonce, native);
  if (!url) return NextResponse.redirect(`${origin}${back}?error=google`);

  const response = native ? NextResponse.json({ url }) : NextResponse.redirect(url);
  response.cookies.set(GOOGLE_OAUTH_COOKIE, serializeGoogleOAuthState(state), googleOAuthCookieOptions(600));
  return response;
}

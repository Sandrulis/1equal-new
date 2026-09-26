import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE,
  buildGoogleAuthorizeUrl,
  createGoogleOAuthState,
  googleOAuthCookieOptions,
  isGoogleSignInEnabled,
  serializeGoogleOAuthState,
} from "@/app/lib/auth/google-oauth";
import { requireTurnstileToken } from "@/app/lib/security/turnstile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
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

  const state = createGoogleOAuthState(searchParams.get("remember") === "1", from);
  const url = await buildGoogleAuthorizeUrl(origin, state.nonce);
  if (!url) return NextResponse.redirect(`${origin}${back}?error=google`);

  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_OAUTH_COOKIE, serializeGoogleOAuthState(state), googleOAuthCookieOptions(600));
  return response;
}

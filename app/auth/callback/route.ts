import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GOOGLE_OAUTH_COOKIE,
  clearGoogleOAuthCookie,
  completeGoogleSignIn,
  googleOAuthStatesMatch,
  parseGoogleOAuthState,
} from "@/app/lib/auth/google-oauth";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const cookieStore = await cookies();
  const googleState = parseGoogleOAuthState(cookieStore.get(GOOGLE_OAUTH_COOKIE)?.value);
  const stateParam = searchParams.get("state");

  if (googleOAuthStatesMatch(googleState, stateParam) && googleState) {
    if (searchParams.get("error") === "access_denied" || !searchParams.get("code")) {
      const back = googleState.from === "signup" ? "/signup?error=google" : "/login?error=google";
      return clearGoogleOAuthCookie(NextResponse.redirect(`${origin}${back}`));
    }
    return completeGoogleSignIn(request, origin, searchParams.get("code") ?? "", googleState);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = searchParams.get("next");
      const destination = next === "/reset-password" ? "/reset-password" : "/dashboard";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }
  return NextResponse.redirect(`${origin}/login`);
}

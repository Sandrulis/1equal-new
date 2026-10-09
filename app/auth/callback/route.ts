import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GOOGLE_OAUTH_COOKIE,
  clearGoogleOAuthCookie,
  completeGoogleSignIn,
  googleOAuthStatesMatch,
  parseGoogleOAuthState,
} from "@/app/lib/auth/google-oauth";
import { settleAccountDeletionOnSignIn, withAccountRestoredCookie } from "@/app/lib/auth/account-deletion";
import { publicRequestOrigin } from "@/app/lib/public-origin";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicRequestOrigin(request);
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

  const tokenHash = searchParams.get("token_hash")?.trim() ?? "";
  const otpType = searchParams.get("type");
  if (tokenHash && (otpType === "recovery" || otpType === "magiclink") && tokenHash.length <= 2000 && !/[^A-Za-z0-9._~=-]/.test(tokenHash)) {
    const supabase = await createClient();
    const verified = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
    if (!verified.error && verified.data.user) {
      const email = verified.data.user.email?.trim().toLowerCase();
      if (email) {
        const admin = createAdminClient();
        if (admin) await admin.from("users").update({ email }).eq("id", verified.data.user.id);
      }
      const settlement = await settleAccountDeletionOnSignIn(verified.data.user.id);
      if (settlement === "deleted") {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=deleted`);
      }
      const next = searchParams.get("next");
      const destination = otpType === "recovery" || next === "/reset-password" ? "/reset-password" : "/dashboard";
      const response = NextResponse.redirect(`${origin}${destination}`);
      if (settlement === "restored") withAccountRestoredCookie(response);
      return response;
    }
    return NextResponse.redirect(`${origin}/login`);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const email = data.user?.email?.trim().toLowerCase();
      if (data.user && email) {
        const admin = createAdminClient();
        if (admin) await admin.from("users").update({ email }).eq("id", data.user.id);
      }
      const settlement = data.user ? await settleAccountDeletionOnSignIn(data.user.id) : "none";
      if (settlement === "deleted") {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=deleted`);
      }
      const next = searchParams.get("next");
      const destination = next === "/reset-password" ? "/reset-password" : "/dashboard";
      const response = NextResponse.redirect(`${origin}${destination}`);
      if (settlement === "restored") withAccountRestoredCookie(response);
      return response;
    }
  }
  return NextResponse.redirect(`${origin}/login`);
}

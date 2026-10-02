import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthScreen } from "@/app/components/auth-screen";
import { isGoogleSignInEnabled } from "@/app/lib/auth/google-oauth";
import { getPublicTurnstileSiteKey } from "@/app/lib/security/turnstile";

export const metadata: Metadata = {
  title: "Reģistrēties",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const [turnstileSiteKey, googleEnabled, headerStore] = await Promise.all([getPublicTurnstileSiteKey(), isGoogleSignInEnabled(), headers()]);
  return <AuthScreen mode="signup" turnstileSiteKey={turnstileSiteKey} googleEnabled={googleEnabled} scriptNonce={headerStore.get("x-nonce") ?? ""} />;
}

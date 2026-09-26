import type { Metadata } from "next";
import { AuthScreen } from "@/app/components/auth-screen";
import { isGoogleSignInEnabled } from "@/app/lib/auth/google-oauth";
import { getPublicTurnstileSiteKey } from "@/app/lib/security/turnstile";

export const metadata: Metadata = {
  title: "Ienākt",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const [turnstileSiteKey, googleEnabled] = await Promise.all([getPublicTurnstileSiteKey(), isGoogleSignInEnabled()]);
  return <AuthScreen mode="login" turnstileSiteKey={turnstileSiteKey} googleEnabled={googleEnabled} />;
}

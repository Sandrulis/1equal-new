import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthScreen } from "@/app/components/auth-screen";
import { isGoogleSignInEnabled } from "@/app/lib/auth/google-oauth";
import { absolutePublicUrl } from "@/app/lib/public-metadata";
import { safeTrainingPath } from "@/app/lib/safe-next";
import { getPublicTurnstileSiteKey } from "@/app/lib/security/turnstile";

export const metadata: Metadata = {
  title: "Reģistrēties",
  alternates: { canonical: absolutePublicUrl("/signup") },
  robots: { index: false, follow: false },
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [turnstileSiteKey, googleEnabled, headerStore, query] = await Promise.all([getPublicTurnstileSiteKey(), isGoogleSignInEnabled(), headers(), searchParams]);
  return <AuthScreen mode="signup" turnstileSiteKey={turnstileSiteKey} googleEnabled={googleEnabled} scriptNonce={headerStore.get("x-nonce") ?? ""} trainingNext={safeTrainingPath(query.next)} />;
}

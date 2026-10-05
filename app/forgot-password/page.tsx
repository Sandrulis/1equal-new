import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthScreen } from "@/app/components/auth-screen";
import { safeTrainingPath } from "@/app/lib/safe-next";
import { getPublicTurnstileSiteKey } from "@/app/lib/security/turnstile";

export const metadata: Metadata = {
  title: "Aizmirsi paroli",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [turnstileSiteKey, headerStore, query] = await Promise.all([getPublicTurnstileSiteKey(), headers(), searchParams]);
  return <AuthScreen mode="forgot" turnstileSiteKey={turnstileSiteKey} scriptNonce={headerStore.get("x-nonce") ?? ""} trainingNext={safeTrainingPath(query.next)} />;
}

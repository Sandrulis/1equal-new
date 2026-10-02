import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthScreen } from "@/app/components/auth-screen";
import { getPublicTurnstileSiteKey } from "@/app/lib/security/turnstile";

export const metadata: Metadata = {
  title: "Aizmirsi paroli",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const [turnstileSiteKey, headerStore] = await Promise.all([getPublicTurnstileSiteKey(), headers()]);
  return <AuthScreen mode="forgot" turnstileSiteKey={turnstileSiteKey} scriptNonce={headerStore.get("x-nonce") ?? ""} />;
}

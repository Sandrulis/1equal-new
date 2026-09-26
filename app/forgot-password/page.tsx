import type { Metadata } from "next";
import { AuthScreen } from "@/app/components/auth-screen";
import { getPublicTurnstileSiteKey } from "@/app/lib/security/turnstile";

export const metadata: Metadata = {
  title: "Aizmirsi paroli",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const turnstileSiteKey = await getPublicTurnstileSiteKey();
  return <AuthScreen mode="forgot" turnstileSiteKey={turnstileSiteKey} />;
}

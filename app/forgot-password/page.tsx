import type { Metadata } from "next";
import { AuthScreen } from "@/app/components/auth-screen";

export const metadata: Metadata = {
  title: "Aizmirsi paroli",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <AuthScreen mode="forgot" />;
}

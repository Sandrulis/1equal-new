import type { Metadata } from "next";
import { AuthScreen } from "@/app/components/auth-screen";

export const metadata: Metadata = {
  title: "Reģistrēties",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <AuthScreen mode="signup" />;
}

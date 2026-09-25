import type { Metadata } from "next";
import { AuthScreen } from "@/app/components/auth-screen";

export const metadata: Metadata = {
  title: "Ienākt",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}

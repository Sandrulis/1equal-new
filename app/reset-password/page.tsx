import type { Metadata } from "next";
import { ResetPasswordForm } from "@/app/components/reset-password-form";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";

export const metadata: Metadata = {
  title: "Jauna parole",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ice">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <ResetPasswordForm />
      </main>
      <SiteFooter />
    </div>
  );
}

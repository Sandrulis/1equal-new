import type { Metadata } from "next";
import { ResetPasswordForm } from "@/app/components/reset-password-form";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { absolutePublicUrl } from "@/app/lib/public-metadata";

export const metadata: Metadata = {
  title: "Jauna parole",
  alternates: { canonical: absolutePublicUrl("/reset-password") },
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

"use client";

import Link from "next/link";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { useLanguage } from "@/app/lib/language";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-ice text-ink">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start px-4 py-16">
        <p className="text-sm font-medium text-muted">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("notFound.title")}</h1>
        <p className="mt-3 max-w-xl text-muted">{t("notFound.text")}</p>
        <Link href="/" className="mt-8 cursor-pointer rounded-lg bg-navy px-5 py-3 text-sm font-medium text-white hover:bg-navy/90">
          {t("notFound.home")}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

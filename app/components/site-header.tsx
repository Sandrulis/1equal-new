"use client";

import Link from "next/link";
import { ContentImage } from "@/app/components/content-image";
import { LanguageMenu } from "@/app/components/language-menu";
import { useLanguage } from "@/app/lib/language";
import { useSiteBrand } from "@/app/components/site-brand-provider";

export function SiteHeader() {
  const { t } = useLanguage();
  const brand = useSiteBrand();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-lg font-semibold tracking-tight">
            {brand.logoUrl ? <ContentImage src={brand.logoUrl} className="h-8 w-auto" /> : null}
            {brand.name}
          </Link>
          <nav aria-label={t("nav.sections")} className="hidden items-center gap-6 text-sm text-muted md:flex">
            <Link href="/#iespejas" className="cursor-pointer hover:text-ink">
              {t("landing.nav.features")}
            </Link>
            <Link href="/#prieksrocibas" className="cursor-pointer hover:text-ink">
              {t("landing.nav.advantages")}
            </Link>
            <Link href="/#jautajumi" className="cursor-pointer hover:text-ink">
              {t("landing.nav.faq")}
            </Link>
            <Link href="/#soli" className="cursor-pointer hover:text-ink">
              {t("landing.nav.how")}
            </Link>
            <Link href="/#kontakti" className="cursor-pointer hover:text-ink">
              {t("landing.nav.contact")}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageMenu />
          <Link href="/login" className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium hover:bg-ice">
            {t("auth.login.title")}
          </Link>
          <Link href="/signup" className="cursor-pointer rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
            {t("auth.signup.nav")}
          </Link>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent } from "react";
import { ContentImage } from "@/app/components/content-image";
import { LanguageMenu } from "@/app/components/language-menu";
import { useLanguage } from "@/app/lib/language";
import { landingSlug, scrollToLandingSection, type LandingSection } from "@/app/lib/landing-sections";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import type { MessageKey } from "@/app/lib/messages";

const NAV: { section: LandingSection; label: MessageKey }[] = [
  { section: "features", label: "landing.nav.features" },
  { section: "advantages", label: "landing.nav.advantages" },
  { section: "faq", label: "landing.nav.faq" },
  { section: "how", label: "landing.nav.how" },
  { section: "contact", label: "landing.nav.contact" },
];

export function SiteHeader() {
  const { t, formatLang } = useLanguage();
  const brand = useSiteBrand();
  const pathname = usePathname();
  const onHome = pathname === "/";

  function openSection(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (!onHome) return;
    event.preventDefault();
    scrollToLandingSection(formatLang, slug, (id) => {
      window.history.pushState(null, "", `#${id}`);
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-lg font-semibold tracking-tight">
            {brand.logoUrl ? <ContentImage src={brand.logoUrl} className="h-8 w-auto" /> : null}
            {brand.name}
          </Link>
          <nav aria-label={t("nav.sections")} className="hidden items-center gap-6 text-sm text-muted md:flex">
            {NAV.map((item) => {
              const slug = landingSlug(formatLang, item.section);
              return (
                <a
                  key={item.section}
                  href={onHome ? `#${slug}` : `/#${slug}`}
                  onClick={(event) => openSection(event, slug)}
                  className="cursor-pointer hover:text-ink"
                >
                  {t(item.label)}
                </a>
              );
            })}
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

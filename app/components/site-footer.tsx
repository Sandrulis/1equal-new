"use client";

import Link from "next/link";
import { useCookieConsent } from "@/app/components/cookie-consent";
import { useLanguage } from "@/app/lib/language";

export function SiteFooter() {
  const { t } = useLanguage();
  const { openSettings } = useCookieConsent();

  return (
    <footer className="border-t border-line bg-paper">
      <div className="flex w-full items-center px-4 py-3 text-sm text-muted min-[600px]:py-6 sm:px-6 lg:px-8">
        <nav aria-label={t("legal.nav")} className="flex w-full flex-wrap justify-end gap-x-4 gap-y-2 text-right">
          <Link href="/privacy" className="cursor-pointer hover:text-ink">
            {t("legal.privacy")}
          </Link>
          <Link href="/terms" className="cursor-pointer hover:text-ink">
            {t("legal.terms")}
          </Link>
          <Link href="/cookies" className="cursor-pointer hover:text-ink">
            {t("legal.cookies")}
          </Link>
          <button type="button" onClick={openSettings} className="hover:text-ink">
            {t("cookie.settings")}
          </button>
        </nav>
      </div>
    </footer>
  );
}

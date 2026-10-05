"use client";

import { LanguageMenu } from "@/app/components/language-menu";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { useLanguage } from "@/app/lib/language";

export function MaintenanceScreen() {
  const { t } = useLanguage();
  const brand = useSiteBrand();

  return (
    <div className="flex min-h-screen flex-col bg-ice text-ink">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <p className="text-sm font-medium tracking-tight">{brand.name}</p>
        <LanguageMenu />
      </header>
      <main className="flex flex-1 items-center px-6 pb-24 sm:px-10">
        <div className="mx-auto w-full max-w-xl">
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-train uppercase">
            <span className="size-1.5 rounded-full bg-train" aria-hidden="true" />
            {t("maintenance.kicker")}
          </p>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">{t("maintenance.title")}</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted">{t("maintenance.lead")}</p>
        </div>
      </main>
    </div>
  );
}

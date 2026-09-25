"use client";

import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { getLegalDocument, type LegalId } from "@/app/lib/legal-documents";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";

const TITLE_KEYS: Record<LegalId, MessageKey> = {
  privacy: "legal.privacy",
  terms: "legal.terms",
  cookies: "legal.cookies",
};

export function LegalDocument({ id }: { id: LegalId }) {
  const { lang, t } = useLanguage();
  const document = getLegalDocument(id, lang);

  return (
    <div className="flex min-h-screen flex-col bg-ice">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <p className="text-sm text-muted">{t("legal.updated")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t(TITLE_KEYS[id])}</h1>
        <p className="mt-4 leading-7 text-muted">{document.intro}</p>
        <div className="mt-10 grid gap-8">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-6 text-muted">
                  {paragraph}
                </p>
              ))}
              {section.rows ? (
                <div className="mt-4 overflow-x-auto rounded-xl bg-paper ring-1 ring-line">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead className="bg-ice text-muted">
                      <tr>
                        <th className="px-4 py-2 font-medium">{t("cookie.table.name")}</th>
                        <th className="px-4 py-2 font-medium">{t("cookie.table.purpose")}</th>
                        <th className="px-4 py-2 font-medium">{t("cookie.table.duration")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={row.name} className="border-t border-line">
                          <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                          <td className="px-4 py-3 text-muted">{row.purpose}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted">{row.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

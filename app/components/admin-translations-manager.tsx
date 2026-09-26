"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconPencil, IconPlus, IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { deleteSiteTranslation, saveSiteTranslation } from "@/app/lib/site-admin/actions";
import type { SiteLanguage, SiteTranslationRow } from "@/app/lib/site-admin/types";
import { useLanguage } from "@/app/lib/language";

type Draft = { key: string; values: Record<string, string> };

function emptyDraft(languages: SiteLanguage[]): Draft {
  return { key: "", values: Object.fromEntries(languages.map((language) => [language.code, ""])) };
}

export function AdminTranslationsManager({
  translations,
  languages,
}: {
  translations: SiteTranslationRow[];
  languages: SiteLanguage[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SiteTranslationRow | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(languages));
  const [deleteTarget, setDeleteTarget] = useState<SiteTranslationRow | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setDraft(emptyDraft(languages));
  }, [languages, open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return translations;
    return translations.filter((row) => {
      const haystack = [row.key, ...Object.values(row.values)].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, translations]);

  const initialDraft = useMemo<Draft>(() => {
    if (!editing) return emptyDraft(languages);
    return {
      key: editing.key,
      values: Object.fromEntries(languages.map((language) => [language.code, editing.values[language.code] ?? ""])),
    };
  }, [editing, languages]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft(languages));
    setOpen(true);
  }

  function openEdit(row: SiteTranslationRow) {
    setEditing(row);
    setDraft({
      key: row.key,
      values: Object.fromEntries(languages.map((language) => [language.code, row.values[language.code] ?? ""])),
    });
    setOpen(true);
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || pending) return;
    setPending(true);
    const result = await saveSiteTranslation({
      key: draft.key,
      previousKey: editing?.key ?? null,
      values: draft.values,
    });
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setOpen(false);
    showFeedback({ message: t(editing ? "site_translations.saved" : "site_translations.created"), variant: "success" });
    router.refresh();
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setPending(true);
    const result = await deleteSiteTranslation(deleteTarget.key);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setDeleteTarget(null);
    showFeedback({ message: t("site_translations.deleted"), variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-train-soft px-4 py-3 text-sm text-train">{t("site_translations.help")}</p>
      <div className="flex flex-col gap-3 rounded-2xl bg-paper p-4 ring-1 ring-line sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("site_translations.search")}
          aria-label={t("site_translations.search")}
          className="min-w-0 flex-1 rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line outline-none focus:ring-navy"
        />
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90">
          <IconPlus />
          {t("site_translations.create")}
        </button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-2xl bg-paper ring-1 ring-line">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-ice text-left text-xs font-medium text-muted">
            <tr>
              <th className="px-4 py-3">{t("common.key")}</th>
              <th className="px-4 py-3">{t("site_translations.column")}</th>
              <th className="px-4 py-3 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.key} className="border-t border-line align-top">
                <td className="px-4 py-3 font-mono text-xs font-semibold">{row.key}</td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {languages.map((language) => (
                      <p key={language.code} className="text-sm text-muted">
                        <span className="font-mono text-xs uppercase">{language.code}</span> {row.values[language.code] || "-"}
                      </p>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconTipButton label={t("actions.edit")} onClick={() => openEdit(row)}>
                      <IconPencil />
                    </IconTipButton>
                    <IconTipButton
                      label={row.bundled ? t("site_translations.delete.bundled_disabled") : t("actions.delete")}
                      tone="game"
                      disabled={row.bundled}
                      onClick={() => {
                        if (!row.bundled) setDeleteTarget(row);
                      }}
                    >
                      <IconTrash />
                    </IconTipButton>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  {t("site_translations.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminDialog
        open={open}
        wide
        title={editing ? t("actions.edit") : t("site_translations.create")}
        lead={t("site_translations.form.lead")}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(event) => void onSave(event)} className="space-y-4">
          <label className="block text-sm font-medium">
            {t("common.key")}
            <input
              value={draft.key}
              disabled={editing?.bundled}
              onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))}
              className="mt-2 w-full rounded-xl bg-paper px-3 py-2 font-mono text-sm font-normal ring-1 ring-line outline-none focus:ring-navy disabled:bg-ice"
            />
          </label>
          {languages.map((language) => (
            <label key={language.code} className="block text-sm font-medium">
              {language.name} <span className="font-mono text-xs font-normal text-muted uppercase">{language.code}</span>
              <textarea
                value={draft.values[language.code] ?? ""}
                rows={2}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    values: { ...current.values, [language.code]: event.target.value },
                  }))
                }
                className="mt-2 w-full resize-y rounded-xl bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line outline-none focus:ring-navy"
              />
            </label>
          ))}
          <div className="flex justify-end">
            <button type="submit" disabled={!dirty || pending} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
              {t("actions.save")}
            </button>
          </div>
        </form>
      </AdminDialog>

      <AdminDialog open={deleteTarget !== null} title={t("site_translations.delete.title")} onClose={() => setDeleteTarget(null)}>
        <p className="font-mono text-sm">{deleteTarget?.key}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg bg-paper px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-ice">
            {t("actions.cancel")}
          </button>
          <button type="button" disabled={pending} onClick={() => void onDelete()} className="rounded-lg bg-game px-4 py-2.5 text-sm font-medium text-white hover:bg-game/90 disabled:cursor-not-allowed disabled:opacity-60">
            {t("actions.delete")}
          </button>
        </div>
      </AdminDialog>
    </div>
  );
}

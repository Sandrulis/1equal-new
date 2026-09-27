"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconPencil, IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import {
  createSiteLanguage,
  deleteSiteLanguage,
  setDefaultSiteLanguage,
  updateSiteLanguageActive,
  updateSiteLanguageName,
} from "@/app/lib/site-admin/actions";
import { LANGUAGE_OPTIONS } from "@/app/lib/site-admin/language-options";
import type { SiteLanguage } from "@/app/lib/site-admin/types";
import { useLanguage } from "@/app/lib/language";

export function AdminLanguagesForm({ initialLanguages }: { initialLanguages: SiteLanguage[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [languages, setLanguages] = useState(initialLanguages);
  const [seenLanguages, setSeenLanguages] = useState(initialLanguages);
  const [selectedCode, setSelectedCode] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [editTarget, setEditTarget] = useState<SiteLanguage | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SiteLanguage | null>(null);
  const [pending, setPending] = useState(false);
  if (initialLanguages !== seenLanguages) {
    setSeenLanguages(initialLanguages);
    setLanguages(initialLanguages);
  }

  const existing = new Set(languages.map((language) => language.code));
  const options = LANGUAGE_OPTIONS.filter((option) => !existing.has(option.code));
  const editDirty = editTarget ? editName.trim() !== editTarget.name && editName.trim() !== "" : false;

  function saved(message: "site_languages.saved" | "site_languages.created" | "site_languages.deleted") {
    showFeedback({ message: t(message), variant: "success" });
    router.refresh();
  }

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const option = LANGUAGE_OPTIONS.find((item) => item.code === selectedCode);
    if (!option) {
      showFeedback({ message: t("site_languages.error.invalid"), variant: "error" });
      return;
    }
    setPending(true);
    const result = await createSiteLanguage(option.code, option.name, makeDefault);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setSelectedCode("");
    setMakeDefault(false);
    saved("site_languages.created");
  }

  async function onActive(language: SiteLanguage, nextActive: boolean) {
    if (!nextActive && language.isDefault) {
      showFeedback({ message: t("site_languages.error.default_active"), variant: "error" });
      return;
    }
    const previous = languages;
    setLanguages((current) => current.map((item) => (item.code === language.code ? { ...item, isActive: nextActive } : item)));
    setPending(true);
    const result = await updateSiteLanguageActive(language.code, nextActive);
    setPending(false);
    if (!result.ok) {
      setLanguages(previous);
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    saved("site_languages.saved");
  }

  async function onDefault(language: SiteLanguage) {
    if (language.isDefault) return;
    const previous = languages;
    setLanguages((current) =>
      current.map((item) => ({
        ...item,
        isDefault: item.code === language.code,
        isActive: item.code === language.code ? true : item.isActive,
      })),
    );
    setPending(true);
    const result = await setDefaultSiteLanguage(language.code);
    setPending(false);
    if (!result.ok) {
      setLanguages(previous);
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    saved("site_languages.saved");
  }

  async function onEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget || !editDirty) return;
    setPending(true);
    const result = await updateSiteLanguageName(editTarget.code, editName);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setEditTarget(null);
    saved("site_languages.saved");
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setPending(true);
    const result = await deleteSiteLanguage(deleteTarget.code);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setDeleteTarget(null);
    saved("site_languages.deleted");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void onCreate(event)} className="rounded-2xl bg-paper p-5 ring-1 ring-line">
        <h2 className="text-base font-semibold">{t("site_languages.create.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("site_languages.create.description")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <select
            value={selectedCode}
            onChange={(event) => setSelectedCode(event.target.value)}
            className="rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line outline-none focus:ring-navy"
          >
            <option value="">{t("site_languages.create.placeholder")}</option>
            {options.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code.toUpperCase()} {option.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line">
            {t("common.default")}
            <Switch checked={makeDefault} label={t("site_languages.create.make_default")} onChange={setMakeDefault} />
          </label>
          <button type="submit" disabled={pending || !selectedCode} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
            {t("actions.add")}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-ice text-left text-xs font-medium text-muted">
              <tr>
                <th className="px-4 py-3">{t("language.label")}</th>
                <th className="px-4 py-3">{t("common.code")}</th>
                <th className="px-4 py-3">{t("common.active")}</th>
                <th className="px-4 py-3">{t("common.default")}</th>
                <th className="px-4 py-3 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((language) => (
                <tr key={language.code} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{language.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{language.code}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={language.isActive}
                      disabled={pending}
                      label={`${language.name} ${t("common.active")}`}
                      onChange={(next) => void onActive(language, next)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={language.isDefault}
                      disabled={pending}
                      label={`${language.name} ${t("common.default")}`}
                      onChange={() => void onDefault(language)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconTipButton
                        label={t("actions.edit")}
                        onClick={() => {
                          setEditTarget(language);
                          setEditName(language.name);
                        }}
                      >
                        <IconPencil />
                      </IconTipButton>
                      <IconTipButton
                        label={language.isDefault ? t("site_languages.delete.default_disabled") : t("actions.delete")}
                        tone="game"
                        disabled={language.isDefault || pending}
                        onClick={() => {
                          if (!language.isDefault) setDeleteTarget(language);
                        }}
                      >
                        <IconTrash />
                      </IconTipButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminDialog open={editTarget !== null} title={t("actions.edit")} onClose={() => setEditTarget(null)}>
        <form onSubmit={(event) => void onEdit(event)} className="space-y-4">
          <label className="block text-sm font-medium">
            {t("language.label")}
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="mt-2 w-full rounded-xl bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line outline-none focus:ring-navy"
            />
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={!editDirty || pending} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
              {t("actions.save")}
            </button>
          </div>
        </form>
      </AdminDialog>

      <AdminDialog open={deleteTarget !== null} title={t("site_languages.delete.title")} lead={t("site_languages.delete.lead")} onClose={() => setDeleteTarget(null)}>
        <p className="text-sm font-medium">{deleteTarget?.name}</p>
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

function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-navy" : "bg-grid"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

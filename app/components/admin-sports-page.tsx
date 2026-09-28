"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconPencil, IconPlus, IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { SportIcon } from "@/app/components/sport-switch";
import { FRONTEND_MODULE_KEYS, type FrontendModule } from "@/app/lib/frontend-modules";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { createSport, deleteSport, setSportActive, updateSport } from "@/app/lib/site-admin/actions";
import type { SiteLanguage } from "@/app/lib/site-admin/types";
import { SPORT_ICONS, sportLabel, type Sport, type SportIcon as SportIconName } from "@/app/lib/sports";

const MODULE_LABEL: Record<string, MessageKey> = {
  [FRONTEND_MODULE_KEYS.subteams]: "nav.subteams",
  [FRONTEND_MODULE_KEYS.gameLayout]: "frontend_modules.game_layout",
  [FRONTEND_MODULE_KEYS.finance]: "frontend_modules.finance",
  [FRONTEND_MODULE_KEYS.calendar]: "frontend_modules.calendar",
};

const ICON_LABEL: Record<SportIconName, MessageKey> = {
  hockey: "sports.icon.hockey",
  ball: "sports.icon.ball",
  basket: "sports.icon.basket",
  racket: "sports.icon.racket",
  swim: "sports.icon.swim",
  run: "sports.icon.run",
};

export function AdminSportsPage({
  initialSports,
  languages,
  modules,
}: {
  initialSports: Sport[];
  languages: SiteLanguage[];
  modules: FrontendModule[];
}) {
  const { t, lang, languages: uiLanguages } = useLanguage();
  const fallback = uiLanguages.find((language) => language.isDefault)?.code ?? lang;
  const { showFeedback } = useFeedbackToast();
  const router = useRouter();
  const [sports, setSports] = useState(initialSports);
  const [seen, setSeen] = useState(initialSports);
  const [editing, setEditing] = useState<Sport | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sport | null>(null);
  if (initialSports !== seen) {
    setSeen(initialSports);
    setSports(initialSports);
  }

  const orderedLanguages = [...languages].sort((left, right) => left.sortOrder - right.sortOrder);

  async function toggle(sport: Sport) {
    if (pending) return;
    setPending(true);
    const result = await setSportActive(sport.id, !sport.isActive);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setSports(result.sports);
    showFeedback({ message: t("sports.saved"), variant: "success" });
    router.refresh();
  }

  async function remove() {
    if (!deleteTarget || pending) return;
    setPending(true);
    const result = await deleteSport(deleteTarget.id);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setSports(result.sports);
    setDeleteTarget(null);
    showFeedback({ message: t("sports.deleted"), variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.admin.sports")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("sports.lead")}</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
          <IconPlus />
          {t("actions.add")}
        </button>
      </div>
      {sports.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-8 text-sm text-muted ring-1 ring-line">{t("sports.empty")}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
          {sports.map((sport) => (
            <li key={sport.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ice text-ink">
                  <SportIcon icon={sport.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{sportLabel(sport, lang, fallback)}</span>
                  <span className="block truncate text-xs text-muted">
                    {sport.moduleKeys.length
                      ? sport.moduleKeys.map((key) => (MODULE_LABEL[key] ? t(MODULE_LABEL[key]) : key)).join(", ")
                      : t("sports.modules.empty")}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={sport.isActive}
                  aria-label={t("sports.active")}
                  disabled={pending}
                  onClick={() => void toggle(sport)}
                  className={`relative h-6 w-11 rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${sport.isActive ? "bg-navy" : "bg-grid"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition ${sport.isActive ? "translate-x-5" : ""}`} />
                </button>
                <IconTipButton label={t("actions.edit")} tone="muted" disabled={pending} onClick={() => setEditing(sport)}>
                  <IconPencil />
                </IconTipButton>
                <IconTipButton label={t("actions.delete")} tone="game" disabled={pending} onClick={() => setDeleteTarget(sport)}>
                  <IconTrash />
                </IconTipButton>
              </span>
            </li>
          ))}
        </ul>
      )}
      {creating || editing ? (
        <SportForm
          sport={editing}
          languages={orderedLanguages}
          modules={modules}
          pending={pending}
          onClose={() => {
            if (pending) return;
            setCreating(false);
            setEditing(null);
          }}
          onSave={async (input) => {
            setPending(true);
            const result = editing ? await updateSport({ id: editing.id, ...input }) : await createSport(input);
            setPending(false);
            if (!result.ok) {
              showFeedback({ message: t(result.error), variant: "error" });
              return;
            }
            setSports(result.sports);
            setCreating(false);
            setEditing(null);
            showFeedback({ message: t(editing ? "sports.saved" : "sports.created"), variant: "success" });
            router.refresh();
          }}
        />
      ) : null}
      <AdminDialog
        open={deleteTarget !== null}
        title={t("sports.delete.title")}
        lead={deleteTarget ? t("sports.delete.lead", { name: sportLabel(deleteTarget, lang, fallback) }) : undefined}
        onClose={pending ? () => undefined : () => setDeleteTarget(null)}
      >
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="button" onClick={() => void remove()} disabled={pending} className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {t("actions.delete")}
          </button>
        </div>
      </AdminDialog>
    </div>
  );
}

function SportForm({
  sport,
  languages,
  modules,
  pending,
  onClose,
  onSave,
}: {
  sport: Sport | null;
  languages: SiteLanguage[];
  modules: FrontendModule[];
  pending: boolean;
  onClose: () => void;
  onSave: (input: { names: Record<string, string>; icon: SportIconName; moduleKeys: string[]; isActive: boolean }) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [names, setNames] = useState<Record<string, string>>(() => ({ ...(sport?.names ?? {}) }));
  const [icon, setIcon] = useState<SportIconName>(sport?.icon ?? "hockey");
  const [moduleKeys, setModuleKeys] = useState<string[]>(() => sport?.moduleKeys ?? modules.filter((item) => item.isEnabled).map((item) => item.moduleKey));
  const [isActive, setIsActive] = useState(sport?.isActive ?? true);
  const activeLanguages = languages.filter((language) => language.isActive);
  const ready = activeLanguages.every((language) => (names[language.code] ?? "").trim().length > 0);

  return (
    <AdminDialog open title={sport ? t("actions.edit") : t("sports.add")} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready || pending) return;
          void onSave({ names, icon, moduleKeys, isActive });
        }}
      >
        <div className="grid gap-3">
          {languages.map((language) => (
            <label key={language.code} className="block text-sm">
              <span className="text-muted">
                {language.name}
                {language.isActive ? "" : ` (${t("sports.inactive")})`}
              </span>
              <input
                value={names[language.code] ?? ""}
                maxLength={80}
                disabled={pending}
                onChange={(event) => setNames((current) => ({ ...current, [language.code]: event.target.value }))}
                className="mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm text-ink ring-1 ring-line outline-none focus:ring-train disabled:opacity-60"
              />
            </label>
          ))}
        </div>
        <div>
          <p className="text-sm text-muted">{t("sports.icon")}</p>
          <div className="mt-2 inline-flex rounded-lg bg-paper p-1 ring-1 ring-line" role="group" aria-label={t("sports.icon")}>
            {SPORT_ICONS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={icon === item}
                aria-label={t(ICON_LABEL[item])}
                disabled={pending}
                title={t(ICON_LABEL[item])}
                onClick={() => setIcon(item)}
                className={`grid h-9 w-11 place-items-center rounded-md disabled:cursor-not-allowed ${icon === item ? "bg-navy text-white" : "text-muted hover:bg-ice hover:text-ink"}`}
              >
                <SportIcon icon={item} />
              </button>
            ))}
          </div>
        </div>
        <fieldset>
          <legend className="text-sm text-muted">{t("sports.modules")}</legend>
          <div className="mt-2 grid gap-2">
            {modules.map((module) => {
              const checked = moduleKeys.includes(module.moduleKey);
              const label = MODULE_LABEL[module.moduleKey] ? t(MODULE_LABEL[module.moduleKey]) : module.moduleKey;
              return (
                <label key={module.moduleKey} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pending}
                    onChange={() => setModuleKeys((current) => (checked ? current.filter((key) => key !== module.moduleKey) : [...current, module.moduleKey]))}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-ice px-3 py-2.5">
          <span className="text-sm font-medium">{t("sports.active")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-label={t("sports.active")}
            disabled={pending}
            onClick={() => setIsActive((value) => !value)}
            className={`relative h-6 w-11 rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${isActive ? "bg-navy" : "bg-grid"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition ${isActive ? "translate-x-5" : ""}`} />
          </button>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={!ready || pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {t("actions.save")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

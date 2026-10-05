"use client";

import { useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconChevronRight, IconPencil, IconPlus, IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { useLanguage } from "@/app/lib/language";
import { cleanPositionCode } from "@/app/lib/positions";
import { deleteSportPosition, moveSportPosition, saveSportPosition } from "@/app/lib/site-admin/actions";
import type { SiteLanguage } from "@/app/lib/site-admin/types";
import { sportLabel, type Sport, type SportPosition } from "@/app/lib/sports";

const fieldClass = "mt-1.5 w-full rounded-lg bg-ice px-3 py-2.5 text-sm text-ink ring-1 ring-line outline-none focus:ring-train disabled:opacity-60";

export function AdminSportPositions({
  sport,
  languages,
  onClose,
  onChange,
}: {
  sport: Sport;
  languages: SiteLanguage[];
  onClose: () => void;
  onChange: (sports: Sport[]) => void;
}) {
  const { t, lang, languages: uiLanguages } = useLanguage();
  const fallback = uiLanguages.find((language) => language.isDefault)?.code ?? lang;
  const { showFeedback } = useFeedbackToast();
  const [editing, setEditing] = useState<SportPosition | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SportPosition | null>(null);
  const formOpen = creating || editing !== null;

  async function persist(task: () => Promise<{ ok: true; sports: Sport[] } | { ok: false; error: Parameters<typeof t>[0] }>, savedKey: "sports.positions.saved" | "sports.positions.deleted" | null) {
    if (pending) return;
    setPending(true);
    const result = await task();
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    onChange(result.sports);
    setCreating(false);
    setEditing(null);
    setDeleteTarget(null);
    if (savedKey) showFeedback({ message: t(savedKey), variant: "success" });
  }

  return (
    <>
      <AdminDialog
        open
        wide
        title={sportLabel(sport, lang, fallback)}
        lead={t("sports.positions.lead")}
        onClose={pending || deleteTarget ? () => undefined : onClose}
      >
        <div className="space-y-4">
          {formOpen ? (
            <PositionForm
              position={editing}
              languages={languages}
              pending={pending}
              onCancel={() => {
                if (pending) return;
                setCreating(false);
                setEditing(null);
              }}
              onSave={(input) =>
                void persist(
                  () => saveSportPosition({ sportId: sport.id, id: editing?.id, code: input.code, names: input.names }),
                  "sports.positions.saved",
                )
              }
            />
          ) : (
            <button type="button" onClick={() => setCreating(true)} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              <IconPlus />
              {t("sports.positions.add")}
            </button>
          )}
          {sport.positions.length === 0 ? (
            <p className="rounded-xl bg-ice px-3 py-4 text-sm text-muted">{t("sports.positions.empty")}</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line">
              {sport.positions.map((position, index) => {
                const name = position.names[lang]?.trim() || position.names[fallback]?.trim() || "";
                return (
                  <li key={position.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="font-semibold">{position.code}</span>
                      {name ? <span className="ml-2 text-sm text-muted">{name}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <IconTipButton label={t("sports.positions.up")} tone="muted" disabled={pending || formOpen || index === 0} onClick={() => void persist(() => moveSportPosition(sport.id, position.id, "up"), null)}>
                        <span className="inline-flex -rotate-90"><IconChevronRight /></span>
                      </IconTipButton>
                      <IconTipButton label={t("sports.positions.down")} tone="muted" disabled={pending || formOpen || index === sport.positions.length - 1} onClick={() => void persist(() => moveSportPosition(sport.id, position.id, "down"), null)}>
                        <span className="inline-flex rotate-90"><IconChevronRight /></span>
                      </IconTipButton>
                      <IconTipButton label={t("actions.edit")} tone="muted" disabled={pending || formOpen} onClick={() => setEditing(position)}>
                        <IconPencil />
                      </IconTipButton>
                      <IconTipButton label={t("actions.delete")} tone="game" disabled={pending || formOpen} onClick={() => setDeleteTarget(position)}>
                        <IconTrash />
                      </IconTipButton>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AdminDialog>
      <AdminDialog
        open={deleteTarget !== null}
        title={t("sports.positions.delete.title")}
        lead={deleteTarget ? t("sports.positions.delete.lead", { code: deleteTarget.code }) : undefined}
        onClose={pending ? () => undefined : () => setDeleteTarget(null)}
      >
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!deleteTarget) return;
              void persist(() => deleteSportPosition(sport.id, deleteTarget.id), "sports.positions.deleted");
            }}
            disabled={pending}
            className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("actions.delete")}
          </button>
        </div>
      </AdminDialog>
    </>
  );
}

function PositionForm({
  position,
  languages,
  pending,
  onCancel,
  onSave,
}: {
  position: SportPosition | null;
  languages: SiteLanguage[];
  pending: boolean;
  onCancel: () => void;
  onSave: (input: { code: string; names: Record<string, string> }) => void;
}) {
  const { t } = useLanguage();
  const [code, setCode] = useState(position?.code ?? "");
  const [names, setNames] = useState<Record<string, string>>(() => ({ ...(position?.names ?? {}) }));
  const activeLanguages = languages.filter((language) => language.isActive);
  const ready = Boolean(cleanPositionCode(code)) && activeLanguages.every((language) => (names[language.code] ?? "").trim().length > 0);

  return (
    <form
      className="space-y-3 rounded-xl bg-ice p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready || pending) return;
        onSave({ code, names });
      }}
    >
      <p className="text-sm font-medium">{position ? t("actions.edit") : t("sports.positions.add")}</p>
      <label className="block text-sm">
        <span className="text-muted">{t("sports.positions.code")}</span>
        <input
          value={code}
          maxLength={8}
          disabled={pending}
          autoCapitalize="characters"
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
          className={fieldClass}
        />
      </label>
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
            className={fieldClass}
          />
        </label>
      ))}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-paper disabled:cursor-not-allowed">
          {t("actions.cancel")}
        </button>
        <button type="submit" disabled={!ready || pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
          {t("actions.save")}
        </button>
      </div>
    </form>
  );
}

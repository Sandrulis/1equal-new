"use client";

import { useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { ColorField } from "@/app/components/color-field";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconPencil, IconPlus, IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useLanguage } from "@/app/lib/language";
import { deleteOwnedSubteam, saveOwnedSubteam } from "@/app/lib/team-actions";
import { useTeamCatalog } from "@/app/lib/team-catalog";
import type { Subteam } from "@/app/lib/demo-data";

export function SubteamAdmin({
  teamId = null,
  subteams: ownedSubteams,
  onChange,
  readOnly = false,
}: {
  teamId?: string | null;
  subteams?: Subteam[];
  onChange?: (subteams: Subteam[]) => void;
  readOnly?: boolean;
}) {
  const { t } = useLanguage();
  const { formatDateTime } = useDisplayFormat();
  const { showFeedback } = useFeedbackToast();
  const catalog = useTeamCatalog();
  const subteams = teamId ? (ownedSubteams ?? []) : catalog.subteams;
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0f6e82");

  function openNew() {
    setEditingId("new");
    setName("");
    setColor("#0f6e82");
  }

  function openEdit(subteam: Subteam) {
    setEditingId(subteam.id);
    setName(subteam.name);
    setColor(subteam.color);
  }

  function close() {
    setEditingId(null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || !editingId || pending) return;
    if (teamId) {
      setPending(true);
      const result = await saveOwnedSubteam({ teamId, id: editingId === "new" ? null : editingId, name: trimmed, color });
      setPending(false);
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      const next = editingId === "new" ? [...subteams, result.subteam] : subteams.map((item) => (item.id === editingId ? result.subteam : item));
      onChange?.(next);
      setEditingId(null);
      return;
    }
    if (editingId === "new") catalog.addSubteam({ name: trimmed, color });
    else catalog.updateSubteam(editingId, { name: trimmed, color });
    setEditingId(null);
  }

  async function remove(id: string) {
    if (pending) return;
    if (teamId) {
      setPending(true);
      const result = await deleteOwnedSubteam(teamId, id);
      setPending(false);
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      onChange?.(subteams.filter((item) => item.id !== id));
      if (editingId === id) setEditingId(null);
      return;
    }
    catalog.removeSubteam(id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("subteams.title")}</h1>
        {readOnly ? null : (
          <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
            <IconPlus />
            {t("actions.add")}
          </button>
        )}
      </div>

      <AdminDialog
        open={editingId !== null}
        title={editingId === "new" ? t("catalog.subteams.add") : t("catalog.subteams.edit")}
        onClose={pending ? () => undefined : close}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          <ColorField value={color} onChange={setColor} label={t("catalog.color")}>
            <label className="block text-sm">
              <span className="text-muted">{t("catalog.name")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg bg-ice px-3 text-ink ring-1 ring-line outline-none focus:ring-train"
              />
            </label>
          </ColorField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
              {t("actions.cancel")}
            </button>
            <button type="submit" disabled={!name.trim() || pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              {t("actions.save")}
            </button>
          </div>
        </form>
      </AdminDialog>

      {subteams.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-8 text-sm text-muted ring-1 ring-line">{t("catalog.subteams.empty")}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
          {subteams.map((subteam) => (
            <li key={subteam.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-md" style={{ background: subteam.color }} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{subteam.name}</span>
                  <span className="block text-xs text-muted tabular-nums">{formatDateTime(subteam.updatedAt)}</span>
                </span>
              </span>
              {readOnly ? null : (
                <span className="flex shrink-0 gap-1">
                  <IconTipButton label={t("roster.edit")} tone="train" onClick={() => openEdit(subteam)}>
                    <IconPencil />
                  </IconTipButton>
                  <IconTipButton label={t("roster.remove")} tone="game" disabled={pending} onClick={() => void remove(subteam.id)}>
                    <IconTrash />
                  </IconTipButton>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

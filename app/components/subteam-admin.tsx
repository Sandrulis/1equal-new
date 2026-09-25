"use client";

import { useState } from "react";
import { IconCheck, IconPencil, IconPlus, IconTipButton, IconTrash, IconX } from "@/app/components/icon-tip-button";
import { formatDisplayDateTime } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import { useTeamCatalog } from "@/app/lib/team-catalog";
import type { Subteam } from "@/app/lib/demo-data";

export function SubteamAdmin() {
  const { t } = useLanguage();
  const { subteams, addSubteam, updateSubteam, removeSubteam } = useTeamCatalog();
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

  function save() {
    const trimmed = name.trim();
    if (!trimmed || !editingId) return;
    if (editingId === "new") addSubteam({ name: trimmed, color });
    else updateSubteam(editingId, { name: trimmed, color });
    setEditingId(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("subteams.title")}</h1>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
          <IconPlus />
          {t("actions.add")}
        </button>
      </div>

      {editingId ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="mb-4 rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block text-sm">
              <span className="text-muted">{t("catalog.name")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">{t("catalog.color")}</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label={t("catalog.color")}
                  className="h-10 w-14 rounded-md bg-ice ring-1 ring-line"
                />
                <span className="h-8 w-8 rounded-md" style={{ background: color }} />
              </span>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={close} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice">
              <IconX />
              {t("actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconCheck />
              {t("actions.save")}
            </button>
          </div>
        </form>
      ) : null}

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
                  <span className="block text-xs text-muted tabular-nums">{formatDisplayDateTime(subteam.updatedAt)}</span>
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                <IconTipButton label={t("roster.edit")} tone="train" onClick={() => openEdit(subteam)}>
                  <IconPencil />
                </IconTipButton>
                <IconTipButton label={t("roster.remove")} tone="game" onClick={() => removeSubteam(subteam.id)}>
                  <IconTrash />
                </IconTipButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

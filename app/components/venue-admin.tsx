"use client";

import { useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconPencil, IconPlus, IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import type { Venue } from "@/app/lib/demo-data";
import { formatDisplayDateTime, formatMoney } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import { hideOwnedVenue, saveOwnedVenue } from "@/app/lib/team-actions";
import { useTeamCatalog } from "@/app/lib/team-catalog";

export function VenueAdmin({
  teamId = null,
  venues: ownedVenues,
  onChange,
}: {
  teamId?: string | null;
  venues?: Venue[];
  onChange?: (venues: Venue[]) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const catalog = useTeamCatalog();
  const source = teamId ? (ownedVenues ?? []) : catalog.venues;
  const venues = source.filter((venue) => !venue.hidden);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function openNew() {
    setEditingId("new");
    setName("");
    setPrice("");
  }

  function openEdit(venue: Venue) {
    setEditingId(venue.id);
    setName(venue.name);
    setPrice(String(venue.pricePerHour));
  }

  function close() {
    setEditingId(null);
  }

  const parsedPrice = Number(price.replace(",", "."));
  const priceOk = price.trim() !== "" && Number.isFinite(parsedPrice) && parsedPrice >= 0;

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || !priceOk || !editingId || pending) return;
    if (teamId) {
      setPending(true);
      const result = await saveOwnedVenue({ teamId, id: editingId === "new" ? null : editingId, name: trimmed, pricePerHour: parsedPrice });
      setPending(false);
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      const next = editingId === "new" ? [...source, result.venue] : source.map((item) => (item.id === editingId ? result.venue : item));
      onChange?.(next);
      setEditingId(null);
      return;
    }
    if (editingId === "new") catalog.addVenue({ name: trimmed, pricePerHour: parsedPrice });
    else catalog.updateVenue(editingId, { name: trimmed, pricePerHour: parsedPrice });
    setEditingId(null);
  }

  async function hide(id: string) {
    if (pending) return;
    if (teamId) {
      setPending(true);
      const result = await hideOwnedVenue(teamId, id);
      setPending(false);
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      onChange?.(source.map((item) => (item.id === id ? { ...item, hidden: true } : item)));
      if (editingId === id) setEditingId(null);
      return;
    }
    catalog.removeVenue(id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("venues.title")}</h1>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
          <IconPlus />
          {t("actions.add")}
        </button>
      </div>

      <AdminDialog open={editingId !== null} title={editingId === "new" ? t("catalog.venues.add") : t("catalog.venues.edit")} onClose={pending ? () => undefined : close}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          <label className="block text-sm">
            <span className="text-muted">{t("catalog.name")}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("catalog.price")}</span>
            <span className="mt-1 flex items-center rounded-lg bg-ice ring-1 ring-line focus-within:ring-train">
              <input
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-ink outline-none"
              />
              <span className="shrink-0 pr-3 text-muted">€</span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
              {t("actions.cancel")}
            </button>
            <button type="submit" disabled={!name.trim() || !priceOk || pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              {t("actions.save")}
            </button>
          </div>
        </form>
      </AdminDialog>

      {venues.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-8 text-sm text-muted ring-1 ring-line">{t("catalog.venues.empty")}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
          {venues.map((venue) => (
            <li key={venue.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {venue.name} <span className="text-train tabular-nums">{formatMoney(venue.pricePerHour)}</span>
                </span>
                <span className="block text-xs text-muted tabular-nums">{formatDisplayDateTime(venue.updatedAt)}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                <IconTipButton label={t("roster.edit")} tone="train" onClick={() => openEdit(venue)}>
                  <IconPencil />
                </IconTipButton>
                <IconTipButton label={t("roster.remove")} tone="game" disabled={pending} onClick={() => void hide(venue.id)}>
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

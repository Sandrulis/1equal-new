"use client";

import { useState } from "react";
import { IconCheck, IconPencil, IconPlus, IconTipButton, IconTrash, IconX } from "@/app/components/icon-tip-button";
import type { Venue } from "@/app/lib/demo-data";
import { formatDisplayDateTime, formatMoney } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import { useTeamCatalog } from "@/app/lib/team-catalog";

export function VenueAdmin() {
  const { t } = useLanguage();
  const { venues, addVenue, updateVenue, removeVenue } = useTeamCatalog();
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

  function save() {
    const trimmed = name.trim();
    if (!trimmed || !priceOk || !editingId) return;
    if (editingId === "new") addVenue({ name: trimmed, pricePerHour: parsedPrice });
    else updateVenue(editingId, { name: trimmed, pricePerHour: parsedPrice });
    setEditingId(null);
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

      {editingId ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="mb-4 rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
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
              <input
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={close} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice">
              <IconX />
              {t("actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !priceOk}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconCheck />
              {t("actions.save")}
            </button>
          </div>
        </form>
      ) : null}

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
                <IconTipButton label={t("roster.remove")} tone="game" onClick={() => removeVenue(venue.id)}>
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

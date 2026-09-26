"use client";

import { useState, type FormEvent } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import type { EventType, Subteam, Venue } from "@/app/lib/demo-data";
import { formatDisplayDate, isoDate, parseIsoDate } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";

export type NewEventInput = {
  date: string;
  start: string;
  type: EventType;
  venueId: string;
  subteamId: string | null;
  expense: number | null;
  withCoach: boolean;
};

export function EventFormDialog({
  initialDate,
  venues,
  subteams,
  pending,
  onClose,
  onCreate,
}: {
  initialDate: string;
  venues: Venue[];
  subteams: Subteam[];
  pending: boolean;
  onClose: () => void;
  onCreate: (input: NewEventInput) => void;
}) {
  const { t } = useLanguage();
  const [date, setDate] = useState(initialDate ? formatDisplayDate(initialDate) : "");
  const [type, setType] = useState<EventType | "">("");
  const [start, setStart] = useState("");
  const [venueId, setVenueId] = useState("");
  const [subteamId, setSubteamId] = useState("");
  const [expense, setExpense] = useState("");
  const [withCoach, setWithCoach] = useState(false);
  const parsedDate = parseDisplayDate(date);
  const parsedExpense = Number(expense.replace(",", "."));
  const expenseOk = expense.trim() !== "" && Number.isFinite(parsedExpense) && parsedExpense >= 0;
  const dateInvalid = date.trim() !== "" && !parsedDate;
  const canSave = Boolean(parsedDate && type && start && venueId && venues.length > 0 && (type === "training" || expenseOk) && !pending);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave || !parsedDate || !type) return;
    onCreate({
      date: parsedDate,
      start: start.slice(0, 5),
      type,
      venueId,
      subteamId: subteamId || null,
      expense: type === "game" ? Math.round(parsedExpense * 100) / 100 : null,
      withCoach: type === "training" && withCoach,
    });
  }

  return (
    <AdminDialog open title={t("event.add")} onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 items-end gap-3">
          <label className="block text-sm">
            <span className="text-muted">{t("event.date")}</span>
            <input
              required
              value={date}
              inputMode="numeric"
              placeholder="dd.mm.yyyy"
              autoComplete="off"
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
            />
            {dateInvalid ? <span className="mt-1 block text-game">{t("event.add.date.invalid")}</span> : null}
          </label>
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="text-sm text-muted">{t("event.type")}</legend>
            <div className="mt-1 flex w-full rounded-lg bg-ice p-1 ring-1 ring-line" role="group" aria-label={t("event.type")}>
              {(["game", "training"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={type === option}
                  onClick={() => setType(option)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm ${type === option ? "bg-paper font-medium shadow-sm" : "text-muted"}`}
                >
                  {t(option === "game" ? "legend.game" : "legend.training")}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className={type === "training" ? "grid grid-cols-2 items-end gap-3" : ""}>
          <label className="block text-sm">
            <span className="text-muted">{t("event.add.start")}</span>
            <input
              required
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
            />
          </label>
          {type === "training" ? (
            <div className="text-sm">
              <span className="text-muted">{t("event.add.coach")}</span>
              <div className="mt-1 flex items-center justify-between rounded-lg bg-ice px-3 py-2 ring-1 ring-line">
                <span className="text-ink">{withCoach ? t("event.add.coach") : t("event.add.coach.off")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={withCoach}
                  aria-label={t("event.add.coach")}
                  onClick={() => setWithCoach((current) => !current)}
                  className={`relative h-6 w-11 shrink-0 rounded-full ${withCoach ? "bg-train" : "bg-line"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper ${withCoach ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <label className="block min-w-0 text-sm">
            <span className="text-muted">{t("event.add.place")}</span>
            {venues.length === 0 ? (
              <span className="mt-1 block rounded-lg bg-ice px-3 py-2 text-muted">{t("catalog.venues.empty")}</span>
            ) : (
              <select
                value={venueId}
                onChange={(event) => setVenueId(event.target.value)}
                className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
              >
                <option value="">{t("event.add.place")}</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="block min-w-0 text-sm">
            <span className="text-muted">{t("event.add.subteam")}</span>
            <select
              value={subteamId}
              onChange={(event) => setSubteamId(event.target.value)}
              className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
            >
              <option value="">{t("event.add.subteam.none")}</option>
              {subteams.map((subteam) => (
                <option key={subteam.id} value={subteam.id}>
                  {subteam.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {type === "game" ? (
          <label className="block text-sm">
            <span className="text-muted">{t("event.add.expense")}</span>
            <span className="mt-1 flex items-center rounded-lg bg-ice ring-1 ring-line focus-within:ring-train">
              <input
                inputMode="decimal"
                value={expense}
                onChange={(event) => setExpense(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-ink outline-none"
              />
              <span className="shrink-0 pr-3 text-muted">€</span>
            </span>
          </label>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={!canSave} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {t("actions.add")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function parseDisplayDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return isoDate(parseIsoDate(isoDate(date)));
}

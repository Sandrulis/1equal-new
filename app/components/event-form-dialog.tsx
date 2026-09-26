"use client";

import { useState, type FormEvent } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { IconChevronLeft, IconChevronRight } from "@/app/components/icon-tip-button";
import type { EventType, Subteam, TeamEvent, Venue } from "@/app/lib/demo-data";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { formatMonthTitle, isoDate, monthGrid, parseIsoDate } from "@/app/lib/format";
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
  event,
  venues,
  subteams,
  pending,
  onClose,
  onCreate,
}: {
  initialDate: string;
  event?: TeamEvent | null;
  venues: Venue[];
  subteams: Subteam[];
  pending: boolean;
  onClose: () => void;
  onCreate: (input: NewEventInput) => void;
}) {
  const { t } = useLanguage();
  const { formatDate } = useDisplayFormat();
  const [dateIso, setDateIso] = useState(event?.date || initialDate || "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState<EventType | "">(event?.type ?? "");
  const [start, setStart] = useState(event?.start ?? "");
  const [venueId, setVenueId] = useState(event?.venueId ?? "");
  const [subteamId, setSubteamId] = useState(event?.subteamId ?? "");
  const [expense, setExpense] = useState(event?.expense != null ? String(event.expense) : "");
  const [withCoach, setWithCoach] = useState(Boolean(event?.withCoach));
  const parsedExpense = Number(expense.replace(",", "."));
  const expenseOk = expense.trim() !== "" && Number.isFinite(parsedExpense) && parsedExpense >= 0;
  const canSave = Boolean(dateIso && type && start && venueId && venues.length > 0 && (type === "training" || expenseOk) && !pending);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave || !dateIso || !type) return;
    onCreate({
      date: dateIso,
      start: start.slice(0, 5),
      type,
      venueId,
      subteamId: subteamId || null,
      expense: type === "game" ? Math.round(parsedExpense * 100) / 100 : null,
      withCoach: type === "training" && withCoach,
    });
  }

  return (
    <AdminDialog open title={event ? t("event.edit") : t("event.add")} onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="block text-sm">
            <span className="text-muted">{t("event.date")}</span>
            <button
              type="button"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((open) => !open)}
              className="mt-1 flex w-full items-center rounded-lg bg-ice px-3 py-2 text-left ring-1 ring-line"
            >
              <span className={dateIso ? "text-ink" : "text-muted"}>{dateIso ? formatDate(dateIso) : formatDate("2026-08-19")}</span>
            </button>
          </div>
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
        {pickerOpen ? (
          <EventDatePicker
            value={dateIso}
            onChange={(iso) => {
              setDateIso(iso);
              setPickerOpen(false);
            }}
          />
        ) : null}
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
            {event ? t("actions.save") : t("actions.add")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function EventDatePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { formatLang, t } = useLanguage();
  const { display, headers } = useDisplayFormat();
  const selected = value ? parseIsoDate(value) : new Date();
  const [year, setYear] = useState(selected.getFullYear());
  const [month, setMonth] = useState(selected.getMonth());
  const today = isoDate(new Date());
  const cells = monthGrid(year, month, display.weekStartDay);

  function shift(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  return (
    <div className="rounded-xl bg-ice p-3 ring-1 ring-line">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" aria-label={t("month.prev")} onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-paper">
          <IconChevronLeft />
        </button>
        <p className="text-sm font-medium">{formatMonthTitle(year, month, formatLang)}</p>
        <button type="button" aria-label={t("month.next")} onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-paper">
          <IconChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted">
        {headers.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const iso = isoDate(date);
          const inMonth = date.getMonth() === month;
          const picked = iso === value;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onChange(iso)}
              className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-sm ${
                picked ? "bg-navy text-white" : iso === today ? "bg-train text-white" : inMonth ? "text-ink hover:bg-paper" : "text-muted hover:bg-paper"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}


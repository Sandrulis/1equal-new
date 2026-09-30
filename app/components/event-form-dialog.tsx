"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AdminDialog } from "@/app/components/admin-dialog";
import { IconChevronLeft, IconChevronRight } from "@/app/components/icon-tip-button";
import type { EventType, Subteam, TeamEvent, Venue } from "@/app/lib/demo-data";
import { useCurrencySymbol } from "@/app/components/currency-provider";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { formatMonthTitle, isoDate, monthGrid, parseIsoDate } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";

const HOURS = Array.from({ length: 15 }, (_, index) => String(index + 8).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function clockParts(value: string): { hour: string; minute: string } {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || !HOURS.includes(match[1]) || !MINUTES.includes(match[2])) return { hour: "", minute: "" };
  return { hour: match[1], minute: match[2] };
}

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
  const { formatDate, formatTime, display } = useDisplayFormat();
  const currency = useCurrencySymbol();
  const initialClock = clockParts(event?.start ?? "");
  const [dateIso, setDateIso] = useState(event?.date || initialDate || "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [type, setType] = useState<EventType | "">(event?.type ?? "");
  const [hour, setHour] = useState(initialClock.hour);
  const [minute, setMinute] = useState(initialClock.minute);
  const [venueId, setVenueId] = useState(event?.venueId ?? "");
  const [subteamId, setSubteamId] = useState(event?.subteamId ?? "");
  const [expense, setExpense] = useState(event?.expense != null ? String(event.expense) : "");
  const [withCoach, setWithCoach] = useState(Boolean(event?.withCoach));
  const timeAnchorRef = useRef<HTMLButtonElement>(null);
  const start = hour && minute ? `${hour}:${minute}` : "";
  const parsedExpense = Number(expense.replace(",", "."));
  const expenseFilled = expense.trim() !== "";
  const expenseOk = !expenseFilled || (Number.isFinite(parsedExpense) && parsedExpense >= 0);
  const canSave = Boolean(dateIso && type && start && venueId && venues.length > 0 && expenseOk && (type === "training" || expenseFilled) && !pending);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave || !dateIso || !type) return;
    onCreate({
      date: dateIso,
      start,
      type,
      venueId,
      subteamId: subteamId || null,
      expense: expenseFilled ? Math.round(parsedExpense * 100) / 100 : null,
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
        <div>
          <div className={type === "training" ? "grid grid-cols-2 items-end gap-3" : ""}>
            <div className="block text-sm">
              <span className="text-muted">{t("event.add.start")}</span>
              <button
                ref={timeAnchorRef}
                type="button"
                aria-expanded={timeOpen}
                aria-label={t("event.add.start")}
                onClick={() => setTimeOpen((open) => !open)}
                className="mt-1 flex w-full items-center rounded-lg bg-ice px-3 py-2 text-left ring-1 ring-line"
              >
                <span className={start ? "text-ink tabular-nums" : "text-muted"}>{start ? formatTime(start) : t("event.add.time")}</span>
              </button>
            </div>
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
          {timeOpen
            ? createPortal(
                <EventTimePicker
                  anchorRef={timeAnchorRef}
                  value={start}
                  timeFormat={display.timeFormat}
                  onCancel={() => setTimeOpen(false)}
                  onSave={(next) => {
                    const parts = clockParts(next);
                    setHour(parts.hour);
                    setMinute(parts.minute);
                    setTimeOpen(false);
                  }}
                />,
                document.body,
              )
            : null}
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
        {type ? (
          <label className="block text-sm">
            <span className="text-muted">{t("event.add.expense")}</span>
            <span className="mt-1 flex items-center rounded-lg bg-ice ring-1 ring-line focus-within:ring-train">
              <input
                inputMode="decimal"
                value={expense}
                onChange={(event) => setExpense(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-ink outline-none"
              />
              <span className="shrink-0 pr-3 text-muted">{currency}</span>
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

const WHEEL_ITEM = 36;
const AM_HOURS = ["08", "09", "10", "11"];
const PM_HOURS = ["12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];

function hour24From12(displayHour: string, period: "AM" | "PM"): number {
  const hour = Number(displayHour);
  return period === "AM" ? hour : hour === 12 ? 12 : hour + 12;
}

function nearestHour(current: number, choices: number[]): string {
  const nearest = choices.reduce((best, hour) => (Math.abs(hour - current) < Math.abs(best - current) ? hour : best), choices[0] ?? current);
  return String(nearest).padStart(2, "0");
}

function EventTimePicker({
  anchorRef,
  value,
  timeFormat,
  onCancel,
  onSave,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  value: string;
  timeFormat: "12" | "24";
  onCancel: () => void;
  onSave: (value: string) => void;
}) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    cancelRef.current = onCancel;
  });
  const parsed = clockParts(value);

  useLayoutEffect(() => {
    function placePanel() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const height = 292;
      const width = 248;
      const below = window.innerHeight - rect.bottom;
      const up = below < height && rect.top > below;
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
      setPlace({ top: up ? Math.max(8, rect.top - height - 4) : rect.bottom + 4, left });
    }
    placePanel();
    function onScroll(event: Event) {
      if (panelRef.current?.contains(event.target as Node)) return;
      placePanel();
    }
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      cancelRef.current();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancelRef.current();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [anchorRef]);
  const [hour, setHour] = useState(parsed.hour || "18");
  const [minute, setMinute] = useState(parsed.minute || "00");
  const is12 = timeFormat === "12";
  const period: "AM" | "PM" = Number(hour) >= 12 ? "PM" : "AM";
  const hour12 = String(Number(hour) % 12 || 12).padStart(2, "0");
  const hourChoices = is12 ? (period === "AM" ? AM_HOURS : PM_HOURS) : HOURS;

  function chooseHour(displayHour: string) {
    if (!is12) {
      setHour(displayHour);
      return;
    }
    setHour(String(hour24From12(displayHour, period)).padStart(2, "0"));
  }

  function choosePeriod(next: "AM" | "PM") {
    const choices = (next === "AM" ? AM_HOURS : PM_HOURS).map((item) => hour24From12(item, next));
    if ((next === "AM" ? AM_HOURS : PM_HOURS).includes(hour12)) {
      setHour(String(hour24From12(hour12, next)).padStart(2, "0"));
      return;
    }
    setHour(nearestHour(Number(hour), choices));
  }

  if (!place) return null;

  return (
    <div ref={panelRef} style={{ top: place.top, left: place.left }} className="fixed z-[90] w-fit rounded-2xl bg-paper p-3 shadow-lg ring-1 ring-line">
      <p className="text-center text-sm font-medium">{t("event.add.time")}</p>
      <div className="relative mt-1">
        <div className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-9 -translate-y-1/2 rounded-xl ring-1 ring-line" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-paper to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 bg-gradient-to-t from-paper to-transparent" />
        <div className="flex items-center justify-center">
          <TimeWheel label={t("event.add.hour")} values={hourChoices} selected={is12 ? hour12 : hour} onSelect={chooseHour} />
          <span className="z-10 px-0.5 text-sm font-medium text-ink">:</span>
          <TimeWheel label={t("event.add.minute")} values={MINUTES} selected={minute} onSelect={setMinute} />
          {is12 ? <TimeWheel label="AM/PM" values={["AM", "PM"]} selected={period} onSelect={(next) => choosePeriod(next as "AM" | "PM")} wide /> : null}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-end gap-1">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-ink">
          {t("actions.cancel")}
        </button>
        <button type="button" onClick={() => onSave(`${hour}:${minute}`)} className="rounded-lg px-3 py-2 text-sm font-medium text-ink ring-1 ring-line">
          {t("actions.save")}
        </button>
      </div>
    </div>
  );
}

function TimeWheel({
  label,
  values,
  selected,
  onSelect,
  wide = false,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fromScroll = useRef(false);
  const index = Math.max(0, values.indexOf(selected));
  const signature = values.join("|");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    node.scrollTo({ top: index * WHEEL_ITEM });
  }, [index, signature]);

  function onScroll() {
    const node = ref.current;
    if (!node) return;
    const next = Math.min(values.length - 1, Math.max(0, Math.round(node.scrollTop / WHEEL_ITEM)));
    const value = values[next];
    if (!value || value === selected) return;
    fromScroll.current = true;
    onSelect(value);
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      onScroll={onScroll}
      className={`h-[180px] snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${wide ? "w-12" : "w-10"}`}
    >
      <div className="h-[72px]" aria-hidden />
      {values.map((value, itemIndex) => {
        const distance = Math.abs(itemIndex - index);
        return (
          <button
            key={value}
            type="button"
            role="option"
            aria-selected={value === selected}
            onClick={() => onSelect(value)}
            className={`flex h-9 w-full snap-center items-center justify-center text-sm tabular-nums ${
              distance === 0 ? "font-medium text-ink" : distance === 1 ? "text-muted" : "text-muted/40"
            }`}
          >
            {value}
          </button>
        );
      })}
      <div className="h-[72px]" aria-hidden />
    </div>
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


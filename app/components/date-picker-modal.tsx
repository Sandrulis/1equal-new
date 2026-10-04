"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronLeft, IconChevronRight, IconX } from "@/app/components/icon-tip-button";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { formatMonthTitle, isoDate, monthGrid, parseIsoDate } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import { useIsClient } from "@/app/lib/use-is-client";

export function DatePickerModal({
  open,
  title,
  value,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  value: string;
  onClose: () => void;
  onSelect: (iso: string) => void;
}) {
  const { t } = useLanguage();
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose, open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label={t("event.close")} className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-paper p-4 ring-1 ring-line">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button type="button" aria-label={t("event.close")} onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-ice">
            <IconX />
          </button>
        </div>
        <DateCalendar
          value={value}
          onChange={(iso) => {
            onSelect(iso);
            onClose();
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

function DateCalendar({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
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
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange(iso);
              }}
              className="grid h-9 w-full place-items-center"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-sm ${
                  picked ? "bg-navy text-white" : iso === today ? "bg-train text-white" : inMonth ? "text-ink hover:bg-paper" : "text-muted hover:bg-paper"
                }`}
              >
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

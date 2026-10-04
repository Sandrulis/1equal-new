"use client";

import { useState } from "react";
import { DatePickerModal } from "@/app/components/date-picker-modal";
import { IconCheck, IconChevronLeft, IconChevronRight } from "@/app/components/icon-tip-button";
import { useFormatMoney } from "@/app/components/currency-provider";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { balanceRangeOk, currentMonthRange, shiftMonth } from "@/app/lib/balance-range";
import { useLanguage } from "@/app/lib/language";

export type BalanceHistoryItem = {
  id: string;
  title: string;
  when: string;
  amount: number;
};

export function useBalanceRange() {
  const initial = currentMonthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  return {
    from,
    to,
    allowed: balanceRangeOk(from, to),
    setRange(nextFrom: string, nextTo: string) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(nextTo)) return;
      if (nextFrom > nextTo) {
        setFrom(nextTo);
        setTo(nextFrom);
        return;
      }
      setFrom(nextFrom);
      setTo(nextTo);
    },
  };
}

export function BalanceRangeFields({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const { t } = useLanguage();
  const { formatDate } = useDisplayFormat();
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [dirty, setDirty] = useState(false);
  const [seenFrom, setSeenFrom] = useState(from);
  const [seenTo, setSeenTo] = useState(to);
  const [picking, setPicking] = useState<"from" | "to" | null>(null);
  if (!dirty && (from !== seenFrom || to !== seenTo)) {
    setSeenFrom(from);
    setSeenTo(to);
    setDraftFrom(from);
    setDraftTo(to);
  }
  const canApply = dirty && balanceRangeOk(draftFrom, draftTo);
  const tooLong = /^\d{4}-\d{2}-\d{2}$/.test(draftFrom) && /^\d{4}-\d{2}-\d{2}$/.test(draftTo) && draftFrom <= draftTo && !balanceRangeOk(draftFrom, draftTo);
  const dateButton = "mt-1 flex h-9 min-w-36 items-center rounded-lg bg-ice px-3 text-left text-sm text-ink ring-1 ring-line";

  function edit(nextFrom: string, nextTo: string) {
    const start = nextFrom > nextTo ? nextTo : nextFrom;
    const end = nextFrom > nextTo ? nextFrom : nextTo;
    setDraftFrom(start);
    setDraftTo(end);
    setDirty(start !== from || end !== to);
  }

  function shift(delta: number) {
    const next = shiftMonth(from, delta);
    setDirty(false);
    onChange(next.from, next.to);
  }

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" aria-label={t("month.prev")} onClick={() => shift(-1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ice ring-1 ring-line">
          <IconChevronLeft />
        </button>
        <div className="text-xs text-muted">
          {t("balance.range.from")}
          <button type="button" onClick={() => setPicking("from")} className={dateButton}>
            {formatDate(draftFrom)}
          </button>
        </div>
        <div className="text-xs text-muted">
          {t("balance.range.to")}
          <button type="button" onClick={() => setPicking("to")} className={dateButton}>
            {formatDate(draftTo)}
          </button>
        </div>
        <button type="button" aria-label={t("month.next")} onClick={() => shift(1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ice ring-1 ring-line">
          <IconChevronRight />
        </button>
        <button
          type="button"
          aria-label={t("balance.range.apply")}
          disabled={!canApply}
          onClick={() => {
            if (!canApply) return;
            setDirty(false);
            onChange(draftFrom, draftTo);
          }}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${canApply ? "bg-[#1b7a46] text-white" : "bg-ice text-muted"}`}
        >
          <IconCheck />
        </button>
      </div>
      {tooLong ? <p className="mt-2 text-sm text-muted">{t("balance.range.long")}</p> : null}
      <DatePickerModal
        open={picking !== null}
        title={t(picking === "to" ? "balance.range.to" : "balance.range.from")}
        value={picking === "to" ? draftTo : draftFrom}
        onClose={() => setPicking(null)}
        onSelect={(iso) => edit(picking === "to" ? draftFrom : iso, picking === "to" ? iso : draftTo)}
      />
    </div>
  );
}

export function BalanceHistory({ items, empty, inset = false, tone = "signed" }: { items: BalanceHistoryItem[]; empty: string; inset?: boolean; tone?: "signed" | "due" }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const pad = inset ? "px-4 sm:px-5" : "";
  if (items.length === 0) return <p className={`py-8 text-sm text-muted ${pad}`}>{empty}</p>;
  const total = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const figure = (amount: number) => (tone === "due" ? formatMoney(Math.abs(amount)) : signedMoney(amount, formatMoney));
  const color = (amount: number) => (tone === "due" || amount < 0 ? "text-game" : "text-train");
  return (
    <div>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className={`flex items-start justify-between gap-4 py-3 ${pad}`}>
            <div className="min-w-0">
              <p className="font-medium">{item.title}</p>
              {item.when ? <p className="text-sm text-muted">{item.when}</p> : null}
            </div>
            <p className={`shrink-0 font-medium tabular-nums ${color(item.amount)}`}>{figure(item.amount)}</p>
          </li>
        ))}
      </ul>
      <div className={`mt-3 flex items-center justify-between gap-3 border-t border-line py-3 ${pad}`}>
        <span className="font-semibold">{t("player.total")}</span>
        <span className={`font-semibold tabular-nums ${tone === "due" || total < 0 ? "text-game" : "text-ink"}`}>{figure(total)}</span>
      </div>
    </div>
  );
}

function signedMoney(amount: number, format: (value: number) => string): string {
  return amount > 0 ? `+${format(amount)}` : format(amount);
}

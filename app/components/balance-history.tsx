"use client";

import { useFormatMoney } from "@/app/components/currency-provider";
import { useLanguage } from "@/app/lib/language";

export type BalanceHistoryItem = {
  id: string;
  title: string;
  when: string;
  amount: number;
};

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

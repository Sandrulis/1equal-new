"use client";

import { useMemo, useState } from "react";
import { formatDisplayDate, formatMoney } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import type { LoginPlan, MovePreview } from "@/app/lib/old-2-new/types";

const TABS = ["members", "users", "events", "balances", "venues", "subteams"] as const;
type Tab = (typeof TABS)[number];

const TAB_KEY: Record<Tab, MessageKey> = {
  members: "nav.members",
  users: "old2new.step.users",
  events: "old2new.step.events",
  balances: "old2new.step.balances",
  venues: "nav.venues",
  subteams: "nav.subteams",
};

const LOGIN_KEY: Record<LoginPlan, MessageKey> = {
  password: "old2new.login.password",
  reset: "old2new.login.reset",
  linked: "old2new.login.linked",
};

export function Old2NewPreview({ preview }: { preview: MovePreview }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("members");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("lv");
  const rows = useMemo(() => buildRows(preview, tab, t).filter((row) => !needle || row.cells.join(" ").toLocaleLowerCase("lv").includes(needle)), [needle, preview, t, tab]);
  const total = countFor(preview, tab);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-navy">{t("old2new.preview.title")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t("old2new.preview.lead")}</p>
      <p className="mt-1 text-sm text-zinc-600">{t("old2new.preview.leader", { name: preview.leader || t("old2new.empty") })}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === item ? "bg-navy text-white" : "bg-zinc-100 text-navy"}`}
          >
            {t(TAB_KEY[item])}
            <span className="ml-1 opacity-70">{countFor(preview, item)}</span>
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("old2new.preview.search")}
        className="mt-3 w-full rounded-lg bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200 outline-none"
      />
      <p className="mt-2 text-sm text-zinc-500">{t("old2new.preview.shown", { n: rows.length, total })}</p>
      <div className="mt-2 max-h-[32rem] overflow-auto rounded-lg ring-1 ring-zinc-200">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
            <tr>{headers(tab, t).map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-3 py-4 text-zinc-500" colSpan={8}>{t("old2new.preview.empty")}</td></tr>
            ) : rows.map((row, index) => (
              <tr key={`${row.key}-${index}`} className="border-t border-zinc-100">
                {row.cells.map((cell, index) => <td key={`${row.key}-${index}`} className="px-3 py-2 align-top text-zinc-800">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function countFor(preview: MovePreview, tab: Tab): number {
  if (tab === "users") return preview.users.length;
  if (tab === "members") return preview.members.length;
  if (tab === "events") return preview.events.length;
  if (tab === "balances") return preview.balances.length;
  if (tab === "venues") return preview.venues.length;
  return preview.subteams.length;
}

function headers(tab: Tab, t: (key: MessageKey, params?: Record<string, string | number>) => string): string[] {
  if (tab === "users") return [t("old2new.col.name"), t("common.email"), t("old2new.col.phone"), t("old2new.col.login"), t("old2new.col.roster")];
  if (tab === "members") return [t("old2new.col.name"), t("old2new.col.number"), t("old2new.col.position"), t("old2new.col.balance"), t("nav.subteams"), t("old2new.col.marks")];
  if (tab === "events") return [t("old2new.col.date"), t("old2new.col.time"), t("event.type"), t("nav.venues"), t("nav.subteams"), t("old2new.col.expense"), t("old2new.col.votes"), t("old2new.col.marks")];
  if (tab === "balances") return [t("old2new.col.name"), t("old2new.col.balance"), t("old2new.col.history"), t("old2new.col.adjustment")];
  if (tab === "venues") return [t("old2new.col.name"), t("old2new.col.price"), t("old2new.col.hidden")];
  return [t("old2new.col.name"), t("old2new.col.color")];
}

function buildRows(
  preview: MovePreview,
  tab: Tab,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): { key: string; cells: string[] }[] {
  const yes = t("old2new.yes");
  const no = t("old2new.no");
  const empty = t("old2new.empty");
  const mark = (flags: string[]) => flags.filter(Boolean).join(", ") || empty;
  if (tab === "users") {
    return preview.users.map((user) => ({
      key: user.email,
      cells: [user.name, user.email, user.phone || empty, t(LOGIN_KEY[user.login]), user.onRoster ? yes : no],
    }));
  }
  if (tab === "members") {
    return preview.members.map((member) => ({
      key: member.email || member.name,
      cells: [
        member.name,
        member.clearedNumber != null ? t("old2new.became", { from: member.clearedNumber, to: empty }) : member.number == null ? empty : String(member.number),
        member.positionFrom ? t("old2new.became", { from: member.positionFrom, to: member.position }) : member.position || empty,
        formatMoney(member.balance),
        member.subteams || empty,
        mark([member.hidden ? t("old2new.col.hidden") : "", member.feeExempt ? t("old2new.col.fee") : "", member.teamAdmin ? t("old2new.col.admin") : ""]),
      ],
    }));
  }
  if (tab === "events") {
    return preview.events.map((event, index) => ({
      key: `${event.date}-${event.start}-${event.venue}-${index}`,
      cells: [
        formatDisplayDate(event.date),
        event.start,
        t(event.type === "game" ? "old2new.type.game" : "old2new.type.training"),
        event.venue || t("old2new.unknown_venue"),
        event.subteam || empty,
        event.expenseWasEmpty ? t("old2new.became", { from: empty, to: formatMoney(0) }) : event.expense == null ? empty : formatMoney(event.expense),
        t("old2new.votes", { going: event.going, absent: event.absent }),
        mark([
          event.hidden ? t("old2new.col.hidden") : "",
          event.withCoach ? t("old2new.col.coach") : "",
          event.lineup ? t("old2new.lineup_count", { n: event.lineup }) : "",
        ]),
      ],
    }));
  }
  if (tab === "balances") {
    return preview.balances.map((row) => ({
      key: `${row.name}-${row.balance}`,
      cells: [row.name, formatMoney(row.balance), formatMoney(row.history), formatMoney(row.adjustment)],
    }));
  }
  if (tab === "venues") {
    return preview.venues.map((venue) => ({
      key: `${venue.name}-${venue.price}`,
      cells: [venue.name, formatMoney(venue.price), venue.hidden ? yes : no],
    }));
  }
  return preview.subteams.map((item) => ({
    key: item.name,
    cells: [item.name, item.color],
  }));
}

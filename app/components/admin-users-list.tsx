"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { PlayerContact } from "@/app/components/player-contact";
import { originLabel } from "@/app/lib/country-name";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import type { SystemUser } from "@/app/lib/site-admin/types";
import { sportLabel, type Sport } from "@/app/lib/sports";

function initials(name: string): string {
  const letters = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return letters || "?";
}

function countKey(count: number): MessageKey {
  return count === 1 ? "admin.users.count.one" : "admin.users.count";
}

export function AdminUsersList({ users, sports }: { users: SystemUser[]; sports: Sport[] }) {
  const { t, lang, languages } = useLanguage();
  const fallbackLang = languages.find((language) => language.isDefault)?.code ?? lang;
  const router = useRouter();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? users.filter((user) => {
          const role = t(user.isAdmin ? "roles.admin" : "roles.user").toLowerCase();
          const teams = user.teams
            .map((team) => {
              const sport = team.sportId ? sports.find((item) => item.id === team.sportId) : null;
              return [team.name, sport ? sportLabel(sport, lang, fallbackLang) : ""].filter(Boolean).join(" ");
            })
            .join(" ");
          const origin = originLabel(user.originIp, user.originCountry, lang);
          return [user.name, user.email, user.phone, origin, user.originIp, role, teams].join(" ").toLowerCase().includes(needle);
        })
      : users;
    return [...matched].sort((left, right) => left.name.localeCompare(right.name, "lv", { sensitivity: "base" }));
  }, [fallbackLang, lang, query, sports, t, users]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("nav.admin.users")}</h1>
        <p className="mt-1 text-sm text-muted">{t(countKey(users.length), { count: users.length })}</p>
      </div>

      <label className="mb-4 flex w-full items-center gap-2 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line focus-within:ring-train">
        <IconSearch />
        <span className="sr-only">{t("admin.users.searchLabel")}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("admin.users.search")}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </label>

      <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ice text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">{t("roster.member")}</th>
                <th className="hidden px-4 py-3 font-medium min-[768px]:table-cell">{t("admin.users.role")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.team")}</th>
                <th className="hidden px-4 py-3 font-medium min-[900px]:table-cell">{t("admin.users.registered")}</th>
                <th className="hidden px-4 py-3 font-medium min-[900px]:table-cell">{t("admin.users.last_seen")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-muted">
                    {query.trim() ? t("admin.users.noMatch") : t("admin.users.empty")}
                  </td>
                </tr>
              ) : (
                visible.map((user) => {
                  return (
                    <tr key={user.id} className="border-b border-line last:border-b-0">
                      <td className="w-full max-w-0 px-4 py-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">
                            {initials(user.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium">{user.name}</span>
                            <PlayerContact email={user.email} phone={user.phone} originIp={user.originIp} originCountry={user.originCountry} />
                            <span className="block text-muted min-[768px]:hidden">{t(user.isAdmin ? "roles.admin" : "roles.user")}</span>
                          </span>
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 whitespace-nowrap min-[768px]:table-cell">
                        <span className="rounded-md bg-ice px-2 py-0.5 text-xs font-semibold">{t(user.isAdmin ? "roles.admin" : "roles.user")}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.teams.length ? (
                          <span className="flex flex-col items-start gap-1">
                            {user.teams.map((team) => {
                              const sport = team.sportId ? sports.find((item) => item.id === team.sportId) : null;
                              const sportName = sport ? sportLabel(sport, lang, fallbackLang) : "";
                              return (
                                <button
                                  key={team.id}
                                  type="button"
                                  onClick={() => router.push(`/dashboard/admin/teams?team=${team.id}`)}
                                  className="flex max-w-full items-baseline gap-2 text-left font-medium text-train"
                                >
                                  <span className="truncate">{team.name}</span>
                                  {sportName ? <span className="shrink-0 font-normal text-muted">{sportName}</span> : null}
                                </button>
                              );
                            })}
                          </span>
                        ) : (
                          <span className="text-muted">{t("admin.users.no_team")}</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 min-[900px]:table-cell">
                        <WhenCell value={user.createdAt} />
                      </td>
                      <td className="hidden px-4 py-3 min-[900px]:table-cell">
                        {user.lastSeenAt ? <WhenCell value={user.lastSeenAt} /> : <span className="text-muted">{t("admin.users.last_seen.never")}</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WhenCell({ value }: { value: string }) {
  const { formatDate, formatDateTime, formatRelative } = useDisplayFormat();
  return (
    <>
      <span className="block tabular-nums" title={formatDateTime(value)}>
        {formatRelative(value)}
      </span>
      <span className="block text-xs text-muted tabular-nums">{formatDate(value)}</span>
    </>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

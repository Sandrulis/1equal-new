"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { LetterFilter } from "@/app/components/letter-filter";
import { AttendanceLegend, AttendanceLines, AttendanceMark } from "@/app/components/attendance-lines";
import { PlayerContact } from "@/app/components/player-contact";
import { originLabel } from "@/app/lib/country-name";
import { nameLetter } from "@/app/lib/name-letter";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { deleteSystemUser } from "@/app/lib/site-admin/actions";
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

export function AdminUsersList({ users, sports, accountId, showAttendance = false, onDeleted }: { users: SystemUser[]; sports: Sport[]; accountId: string; showAttendance?: boolean; onDeleted: (userId: string) => void }) {
  const { t, lang, languages } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const fallbackLang = languages.find((language) => language.isDefault)?.code ?? lang;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SystemUser | null>(null);
  const [pending, setPending] = useState(false);

  async function remove(userId: string) {
    setPending(true);
    const result = await deleteSystemUser(userId);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setRemoving(null);
    onDeleted(userId);
    showFeedback({ message: t("admin.users.deleted"), variant: "success" });
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = users.filter((user) => {
      if (letter && nameLetter(user.name) !== letter) return false;
      if (!needle) return true;
      const role = t(user.isAdmin ? "roles.admin" : "roles.user").toLowerCase();
      const teams = user.teams
        .map((team) => {
          const sport = team.sportId ? sports.find((item) => item.id === team.sportId) : null;
          return [team.name, sport ? sportLabel(sport, lang, fallbackLang) : ""].filter(Boolean).join(" ");
        })
        .join(" ");
      const origin = originLabel(user.originIp, user.originCountry, lang);
      return [user.name, user.email, user.phone, user.languageCode, user.languageName, origin, user.originIp, role, teams].join(" ").toLowerCase().includes(needle);
    });
    return [...matched].sort((left, right) => left.name.localeCompare(right.name, "lv", { sensitivity: "base" }));
  }, [fallbackLang, lang, letter, query, sports, t, users]);

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

      <LetterFilter value={letter} names={users.map((user) => user.name)} onChange={setLetter} />

      <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ice text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">{t("roster.member")}</th>
                <th className="hidden px-4 py-3 font-medium min-[768px]:table-cell">{t("admin.users.role")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.users.team")}</th>
                {showAttendance ? (
                  <th className="hidden px-4 py-3 font-medium min-[768px]:table-cell" aria-describedby="attendance-legend">
                    {t("roster.attendance")}
                    <AttendanceMark />
                  </th>
                ) : null}
                <th className="hidden px-4 py-3 font-medium min-[900px]:table-cell">{t("admin.users.registered")}</th>
                <th className="hidden px-4 py-3 font-medium min-[900px]:table-cell">{t("admin.users.last_seen")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6 + (showAttendance ? 1 : 0)} className="px-4 py-8 text-muted">
                    {query.trim() || letter ? t("admin.users.noMatch") : t("admin.users.empty")}
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
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-medium">{user.name}</span>
                              {user.languageCode ? (
                                <span className="font-normal text-muted">
                                  {user.languageName ? `${user.languageCode} - ${user.languageName}` : user.languageCode}
                                </span>
                              ) : null}
                            </span>
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
                      {showAttendance ? (
                        <td className="hidden px-4 py-3 min-[768px]:table-cell">
                          <AttendanceLines stats={user.attendance} />
                        </td>
                      ) : null}
                      <td className="hidden px-4 py-3 min-[900px]:table-cell">
                        <WhenCell value={user.createdAt} />
                      </td>
                      <td className="hidden px-4 py-3 min-[900px]:table-cell">
                        {user.lastSeenAt ? <WhenCell value={user.lastSeenAt} /> : <span className="text-muted">{t("admin.users.last_seen.never")}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.id === accountId ? null : (
                          <IconTipButton label={t("actions.delete")} tone="game" disabled={pending} onClick={() => setRemoving(user)}>
                            <IconTrash />
                          </IconTipButton>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {showAttendance ? <AttendanceLegend /> : null}
      </div>
      <AdminDialog
        open={removing !== null}
        closeButton
        title={t("admin.users.delete.title")}
        onClose={() => { if (!pending) setRemoving(null); }}
      >
        <p className="text-sm text-muted">{t("admin.users.delete.confirm", { name: removing?.name ?? "" })}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={pending} onClick={() => setRemoving(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="button" disabled={pending || !removing} onClick={() => { if (removing) void remove(removing.id); }} className="inline-flex items-center gap-2 rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {pending ? <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
            {t("actions.delete")}
          </button>
        </div>
      </AdminDialog>
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

"use client";

import { useMemo, useState } from "react";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconCheck, IconTipButton, IconX } from "@/app/components/icon-tip-button";
import { LetterFilter } from "@/app/components/letter-filter";
import { isEhlHost } from "@/app/lib/ehl-team";
import type { EhlDirectoryTeam, EhlTeamMark } from "@/app/lib/ehl-directory";
import { setEhlTeamMark } from "@/app/lib/ehl-marks";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { nameLetter } from "@/app/lib/name-letter";

type MarkFilter = "open" | EhlTeamMark | "all";

const MARK_FILTERS: { id: MarkFilter; label: MessageKey }[] = [
  { id: "open", label: "admin.ehl.filter.open" },
  { id: "info", label: "admin.ehl.info" },
  { id: "no", label: "admin.ehl.no" },
  { id: "yes", label: "admin.ehl.yes" },
  { id: "all", label: "admin.filter.all" },
];

export function AdminEhlTeams({
  teams,
  marks,
  onMarksChange,
}: {
  teams: EhlDirectoryTeam[];
  marks: Record<string, EhlTeamMark>;
  onMarksChange: (marks: Record<string, EhlTeamMark>) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [markFilter, setMarkFilter] = useState<MarkFilter>("open");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const inFilter = useMemo(
    () => teams.filter((team) => matchesMark(marks[team.id], markFilter)),
    [markFilter, marks, teams],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("lv");
    return inFilter.filter((team) => {
      if (letter && nameLetter(team.name) !== letter) return false;
      if (!needle) return true;
      return `${team.name} ${team.manager}`.toLocaleLowerCase("lv").includes(needle);
    });
  }, [inFilter, letter, query]);

  async function choose(teamId: string, mark: EhlTeamMark) {
    if (pendingId) return;
    const next = marks[teamId] === mark ? null : mark;
    const previous = marks;
    const updated = { ...marks };
    if (next) updated[teamId] = next;
    else delete updated[teamId];
    onMarksChange(updated);
    setPendingId(teamId);
    const result = await setEhlTeamMark(teamId, next);
    setPendingId(null);
    if (!result.ok) {
      onMarksChange(previous);
      showFeedback({ message: t(result.error), variant: "error" });
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("nav.admin.ehl")}</h1>
      </div>

      <label className="mb-4 flex w-full items-center gap-2 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line focus-within:ring-train">
        <IconSearch />
        <span className="sr-only">{t("admin.ehl.search")}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("admin.ehl.search")}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </label>

      <div className="mb-4 inline-flex max-w-full flex-wrap rounded-2xl border border-line bg-ice p-1" role="group" aria-label={t("admin.ehl.filter.marks")}>
        {MARK_FILTERS.map((item) => {
          const active = item.id === markFilter;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setMarkFilter(item.id)}
              className={`rounded-xl px-2.5 py-1.5 text-[13px] font-semibold ${active ? "bg-paper text-ink shadow-sm" : item.id === "info" ? "text-[#c05621]" : item.id === "no" ? "text-game" : item.id === "yes" ? "text-[#178a45]" : "text-muted hover:text-ink"}`}
            >
              {t(item.label)}
            </button>
          );
        })}
      </div>

      <LetterFilter value={letter} names={inFilter.map((team) => team.name)} onChange={setLetter} />

      <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ice text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">{t("catalog.name")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.ehl.manager")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-muted">
                    {query.trim() || letter || markFilter !== "open" ? t("admin.teams.noMatch") : t("admin.teams.empty")}
                  </td>
                </tr>
              ) : (
                visible.map((team) => {
                  const href = ehlHref(team.url);
                  const mark = marks[team.id];
                  const busy = pendingId === team.id;
                  return (
                    <tr key={team.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-3 font-medium">
                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer" className="text-train">
                            {team.name}
                          </a>
                        ) : (
                          team.name
                        )}
                      </td>
                      <td className="px-4 py-3">{team.manager || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="flex justify-end gap-1">
                          <IconTipButton label={t("admin.ehl.info")} tone="amber" pressed={mark === "info"} disabled={busy} onClick={() => void choose(team.id, "info")}>
                            <IconI />
                          </IconTipButton>
                          <IconTipButton label={t("admin.ehl.no")} tone="game" pressed={mark === "no"} disabled={busy} onClick={() => void choose(team.id, "no")}>
                            <IconX />
                          </IconTipButton>
                          <IconTipButton label={t("admin.ehl.yes")} tone="ok" pressed={mark === "yes"} disabled={busy} onClick={() => void choose(team.id, "yes")}>
                            <IconCheck />
                          </IconTipButton>
                        </span>
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

function matchesMark(mark: EhlTeamMark | undefined, filter: MarkFilter): boolean {
  if (filter === "all") return true;
  if (filter === "open") return mark !== "no" && mark !== "yes";
  return mark === filter;
}

function ehlHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !isEhlHost(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function IconI() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 8h.01" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

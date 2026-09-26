"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconCheck, IconPencil, IconTipButton, IconTrash, IconX } from "@/app/components/icon-tip-button";
import { formatDisplayDateTime, toLocalDateTimeStamp } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import { deleteTeam, saveTeam } from "@/app/lib/site-admin/actions";
import type { SystemSubteam, SystemTeam, SystemTeamMember } from "@/app/lib/site-admin/types";

export function AdminTeamsList({
  teams,
  subteams,
  members,
  openTeamId = null,
}: {
  teams: SystemTeam[];
  subteams: SystemSubteam[];
  members: SystemTeamMember[];
  openTeamId?: string | null;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [pending, setPending] = useState(false);

  function openEdit(team: SystemTeam) {
    setEditingId(team.id);
    setName(team.name);
    setSavedName(team.name);
  }

  function close() {
    if (pending) return;
    setEditingId(null);
  }

  const dirty = name.trim() !== "" && name.trim() !== savedName;

  async function save() {
    if (!dirty || !editingId || pending) return;
    setPending(true);
    const result = await saveTeam({ id: editingId, name });
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setEditingId(null);
    showFeedback({ message: t("admin.teams.saved"), variant: "success" });
    router.refresh();
  }

  async function remove(id: string) {
    if (pending) return;
    setPending(true);
    const result = await deleteTeam(id);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    if (editingId === id) setEditingId(null);
    showFeedback({ message: t("admin.teams.deleted"), variant: "success" });
    router.refresh();
  }

  const openTeam = teams.find((team) => team.id === openTeamId) ?? null;
  const players = openTeam ? members.filter((member) => member.teamId === openTeam.id) : [];
  const openSubteams = openTeam ? subteams.filter((item) => item.teamId === openTeam.id) : [];

  function openRoster(id: string) {
    router.push(`/dashboard/admin/teams?team=${id}`);
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return teams;
    return teams.filter((team) => team.name.toLowerCase().includes(needle));
  }, [query, teams]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("nav.admin.teams")}</h1>
      </div>

      <label className="mb-4 flex w-full items-center gap-2 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line focus-within:ring-train">
        <IconSearch />
        <span className="sr-only">{t("admin.teams.searchLabel")}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("admin.teams.search")}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </label>

      {editingId ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="mb-4 rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5"
        >
          <label className="block text-sm">
            <span className="text-muted">{t("catalog.name")}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train"
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={close} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
              <IconX />
              {t("actions.cancel")}
            </button>
            <button type="submit" disabled={!dirty || pending} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              <IconCheck />
              {t("actions.save")}
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ice text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">{t("catalog.name")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("nav.subteams")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("admin.teams.players")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-muted">
                    {query.trim() ? t("admin.teams.noMatch") : t("admin.teams.empty")}
                  </td>
                </tr>
              ) : (
                visible.map((team) => {
                  const subteamCount = subteams.filter((item) => item.teamId === team.id).length;
                  const playerCount = members.filter((member) => member.teamId === team.id).length;
                  return (
                    <tr key={team.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openRoster(team.id)} className="block max-w-full truncate text-left font-medium text-train">
                          {team.name}
                        </button>
                        <span className="block text-xs text-muted tabular-nums">{formatDisplayDateTime(toLocalDateTimeStamp(team.updatedAt))}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums">{subteamCount}</td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums">{playerCount}</td>
                      <td className="px-4 py-3">
                        <span className="flex justify-end gap-1">
                          <IconTipButton label={t("roster.edit")} tone="train" disabled={pending} onClick={() => openEdit(team)}>
                            <IconPencil />
                          </IconTipButton>
                          <IconTipButton label={t("roster.remove")} tone="game" disabled={pending} onClick={() => void remove(team.id)}>
                            <IconTrash />
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
      {openTeam ? (
        <AdminDialog open wide closeButton title={openTeam.name} onClose={() => router.replace("/dashboard/admin/teams")}>
          <h3 className="text-sm font-semibold">{t("nav.subteams")}</h3>
          {openSubteams.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("admin.teams.subteams.empty")}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {openSubteams.map((subteam) => (
                <li key={subteam.id} className="inline-flex items-center gap-2 rounded-lg bg-ice px-2.5 py-1.5 text-sm">
                  <span className="h-3.5 w-3.5 shrink-0 rounded" style={{ background: subteam.color }} />
                  {subteam.name}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-6 text-sm font-semibold">{t("admin.teams.players")}</h3>
          {players.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("admin.teams.players.empty")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {players.map((player) => (
                <li key={player.userId} className="flex items-center gap-3 py-3">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-ice object-contain object-center" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{player.name}</span>
                    {player.number != null || player.position ? (
                      <span className="block truncate text-sm text-muted">
                        {player.number != null ? `#${player.number}` : ""}
                        {player.number != null && player.position ? " " : ""}
                        {player.position}
                      </span>
                    ) : null}
                    {player.phone ? <span className="block truncate text-sm text-muted">{player.phone}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminDialog>
      ) : null}
    </div>
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

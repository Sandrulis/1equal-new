"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentImage } from "@/app/components/content-image";
import { LetterFilter } from "@/app/components/letter-filter";
import { PlayerContact } from "@/app/components/player-contact";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconCheck, IconLogin, IconLogout, IconPencil, IconTipButton, IconTrash, IconX } from "@/app/components/icon-tip-button";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useLanguage } from "@/app/lib/language";
import { positionLabel } from "@/app/lib/positions";
import { deleteTeam, saveTeam, setAdminTeamWatch, setTeamModule } from "@/app/lib/site-admin/actions";
import type { SystemSubteam, SystemTeam, SystemTeamMember } from "@/app/lib/site-admin/types";
import { FRONTEND_MODULE_KEYS, type FrontendModule } from "@/app/lib/frontend-modules";
import type { MessageKey } from "@/app/lib/messages";
import { adminTeamHref } from "@/app/lib/dashboard-path";
import { nameLetter } from "@/app/lib/name-letter";
import { queueTeamSwitch } from "@/app/lib/pending-team-switch";
import { sportLabel, type Sport } from "@/app/lib/sports";

const MODULE_LABEL: Record<string, MessageKey> = {
  [FRONTEND_MODULE_KEYS.subteams]: "nav.subteams",
  [FRONTEND_MODULE_KEYS.gameLayout]: "frontend_modules.game_layout",
  [FRONTEND_MODULE_KEYS.finance]: "frontend_modules.finance",
  [FRONTEND_MODULE_KEYS.calendar]: "frontend_modules.calendar",
  [FRONTEND_MODULE_KEYS.entuziasti]: "frontend_modules.entuziasti",
  [FRONTEND_MODULE_KEYS.pond]: "frontend_modules.pond",
};

export function AdminTeamsList({
  teams,
  subteams,
  members,
  modules = [],
  teamModules = [],
  sports = [],
  openTeamId = null,
  accountId,
  watchedTeamIds,
  onNavigate,
}: {
  teams: SystemTeam[];
  subteams: SystemSubteam[];
  members: SystemTeamMember[];
  modules?: FrontendModule[];
  teamModules?: { teamId: string; moduleKey: string }[];
  sports?: Sport[];
  openTeamId?: string | null;
  accountId: string;
  watchedTeamIds: string[];
  onNavigate?: (href: string) => void;
}) {
  const { t, lang, languages } = useLanguage();
  const fallbackLang = languages.find((language) => language.isDefault)?.code ?? lang;
  const { formatDateTime } = useDisplayFormat();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [pending, setPending] = useState(false);
  const [links, setLinks] = useState(teamModules);
  const [seenLinks, setSeenLinks] = useState(teamModules);
  if (teamModules !== seenLinks) {
    setSeenLinks(teamModules);
    setLinks(teamModules);
  }

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

  async function toggleWatch(id: string, watch: boolean) {
    if (pending) return;
    setPending(true);
    const result = await setAdminTeamWatch(id, watch);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t(watch ? "admin.teams.watched" : "admin.teams.unwatched"), variant: "success" });
    if (watch) {
      queueTeamSwitch(id);
      router.push("/dashboard");
    }
    router.refresh();
  }

  const [previewId, setPreviewId] = useState<string | null>(openTeamId);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [seenTeamId, setSeenTeamId] = useState(openTeamId);
  const [ignoreRouteTeam, setIgnoreRouteTeam] = useState(false);
  if (openTeamId !== seenTeamId) {
    setSeenTeamId(openTeamId);
    if (ignoreRouteTeam) {
      if (!openTeamId) setIgnoreRouteTeam(false);
    } else {
      setPreviewId(openTeamId);
      setPreviewLoading(false);
    }
  }
  const openTeam = teams.find((team) => team.id === previewId) ?? null;
  const openSubteams = openTeam ? subteams.filter((item) => item.teamId === openTeam.id) : [];
  const individualModules = modules.filter((module) => module.isIndividual);
  const entuziastiModule = modules.find((module) => module.moduleKey === FRONTEND_MODULE_KEYS.entuziasti);
  const openSportKeys = openTeam?.sportId ? (sports.find((sport) => sport.id === openTeam.sportId)?.moduleKeys ?? null) : null;
  const entuziastiOn = Boolean(
    entuziastiModule?.isEnabled
    && (!entuziastiModule.isIndividual || links.some((link) => link.teamId === openTeam?.id && link.moduleKey === FRONTEND_MODULE_KEYS.entuziasti))
    && (!openSportKeys || openSportKeys.includes(FRONTEND_MODULE_KEYS.entuziasti)),
  );
  const players = useMemo(() => {
    if (!openTeam) return [];
    return members
      .filter((member) => member.teamId === openTeam.id)
      .sort((left, right) => {
        const leftName = (entuziastiOn ? left.ehlName : null) || left.name;
        const rightName = (entuziastiOn ? right.ehlName : null) || right.name;
        return leftName.localeCompare(rightName, "lv", { sensitivity: "base" });
      });
  }, [entuziastiOn, members, openTeam]);

  async function toggleModule(moduleKey: string, enabled: boolean) {
    if (!openTeam || pending) return;
    const previous = links;
    setLinks((current) => (enabled ? [...current, { teamId: openTeam.id, moduleKey }] : current.filter((link) => !(link.teamId === openTeam.id && link.moduleKey === moduleKey))));
    setPending(true);
    const result = await setTeamModule(openTeam.id, moduleKey, enabled);
    setPending(false);
    if (!result.ok) {
      setLinks(previous);
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t("admin.teams.modules.saved"), variant: "success" });
    router.refresh();
  }

  function openRoster(id: string) {
    setIgnoreRouteTeam(false);
    setPreviewId(id);
    if (openTeamId === id) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    (onNavigate ?? ((href: string) => router.push(href)))(adminTeamHref(id));
  }

  function closeRoster() {
    setIgnoreRouteTeam(true);
    setPreviewLoading(false);
    setPreviewId(null);
    (onNavigate ?? ((href: string) => router.push(href)))(adminTeamHref());
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return teams.filter((team) => {
      if (letter && nameLetter(team.name) !== letter) return false;
      if (!needle) return true;
      const sport = team.sportId ? sports.find((item) => item.id === team.sportId) : null;
      const label = sport ? sportLabel(sport, lang, fallbackLang) : "";
      return [team.name, label].join(" ").toLowerCase().includes(needle);
    });
  }, [fallbackLang, lang, letter, query, sports, teams]);

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

      <LetterFilter value={letter} names={teams.map((team) => team.name)} onChange={setLetter} />

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
                    {query.trim() || letter ? t("admin.teams.noMatch") : t("admin.teams.empty")}
                  </td>
                </tr>
              ) : (
                visible.map((team) => {
                  const subteamCount = subteams.filter((item) => item.teamId === team.id).length;
                  const playerCount = members.filter((member) => member.teamId === team.id).length;
                  const sport = team.sportId ? sports.find((item) => item.id === team.sportId) : null;
                  const sportName = sport ? sportLabel(sport, lang, fallbackLang) : "";
                  return (
                    <tr key={team.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openRoster(team.id)} className="flex max-w-full items-baseline gap-2 text-left font-medium text-train">
                          <span className="truncate">{team.name}</span>
                          {sportName ? <span className="shrink-0 font-normal text-muted">{sportName}</span> : null}
                        </button>
                        <span className="block text-xs text-muted tabular-nums">{formatDateTime(team.updatedAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums">{subteamCount}</td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums">{playerCount}</td>
                      <td className="px-4 py-3">
                        <span className="flex justify-end gap-1">
                          {members.some((member) => member.teamId === team.id && member.userId === accountId) ? null : (
                            <IconTipButton
                              label={t(watchedTeamIds.includes(team.id) ? "admin.teams.unwatch" : "admin.teams.watch")}
                              tone={watchedTeamIds.includes(team.id) ? "game" : "train"}
                              disabled={pending}
                              onClick={() => void toggleWatch(team.id, !watchedTeamIds.includes(team.id))}
                            >
                              {watchedTeamIds.includes(team.id) ? <IconLogout /> : <IconLogin />}
                            </IconTipButton>
                          )}
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
      {previewId ? (
        <AdminDialog open blur wide closeButton title={openTeam && !previewLoading ? openTeam.name : t("admin.teams.loading")} onClose={closeRoster}>
          {previewLoading || !openTeam ? (
            <div className="flex flex-col items-center gap-3 py-12" role="status">
              <span className="size-8 animate-spin rounded-full border-2 border-line border-t-navy" aria-hidden="true" />
              <p className="text-sm text-muted">{t("admin.teams.loading")}</p>
            </div>
          ) : (
          <>
          <h3 className="text-sm font-semibold">{t("admin.teams.modules")}</h3>
          {individualModules.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("admin.teams.modules.empty")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {individualModules.map((module) => {
                const labelKey = MODULE_LABEL[module.moduleKey];
                const enabled = links.some((link) => link.teamId === openTeam.id && link.moduleKey === module.moduleKey);
                return (
                  <li key={module.moduleKey} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{labelKey ? t(labelKey) : module.moduleKey}</span>
                      {labelKey ? <span className="block truncate font-mono text-xs text-muted">{module.moduleKey}</span> : null}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={t("frontend_modules.aria.enabled", { key: module.moduleKey })}
                      disabled={pending}
                      onClick={() => void toggleModule(module.moduleKey, !enabled)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? "bg-navy" : "bg-grid"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition ${enabled ? "translate-x-5" : ""}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <h3 className="mt-6 text-sm font-semibold">{t("nav.subteams")}</h3>
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
              {players.map((player) => {
                const photo = entuziastiOn ? player.photoUrl : player.avatarUrl;
                const name = (entuziastiOn ? player.ehlName : null) || player.name;
                const position = entuziastiOn ? player.position || player.ehlPosition : player.position;
                return (
                <li key={player.userId} className="flex items-center gap-3 py-3">
                  {photo ? (
                    <ContentImage src={photo} className="h-10 w-10 shrink-0 rounded-lg bg-ice object-contain object-center" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium">{name}</span>
                      {player.userId === openTeam.leaderId ? (
                        <span className="shrink-0 rounded-full bg-ice px-2 py-0.5 text-xs font-medium text-muted">{t("team.leader")}</span>
                      ) : null}
                      {player.teamAdmin ? (
                        <span className="shrink-0 rounded-full bg-ice px-2 py-0.5 text-xs font-medium text-muted">{t("roles.admin")}</span>
                      ) : null}
                    </span>
                    {player.number != null || position ? (
                      <span className="block truncate text-sm text-muted">
                        {player.number != null ? `#${player.number}` : ""}
                        {player.number != null && position ? " " : ""}
                        {position ? positionLabel(position, t) : ""}
                      </span>
                    ) : null}
                    <PlayerContact email={player.email} phone={player.phone} />
                  </span>
                </li>
                );
              })}
            </ul>
          )}
          </>
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

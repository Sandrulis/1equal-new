"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { ContentImage } from "@/app/components/content-image";
import { CURRENT_USER_ID, EVENTS, MEMBERS, TEAM_NAME, type EventType, type Member, type TeamEvent } from "@/app/lib/demo-data";
import { teamPlayer } from "@/app/lib/auth/profile";
import { creatorMember } from "@/app/lib/team-creator";
import { PlayerLinkHint } from "@/app/components/team-switcher";
import { DEMO_INVITE_CODE, findIssuedTeam, forgetTeam, getCurrentTeam, listMyTeams, normalizeInviteCode, replaceMyTeams, selectMyTeam, setCurrentTeam, type IssuedTeam } from "@/app/lib/invite-code";
import { getDemoSession, settleDemoCharges, subscribeDemoSession, updateDemoSession } from "@/app/lib/demo-session";
import { AdminDialog } from "@/app/components/admin-dialog";
import { SiteContactDialog } from "@/app/components/site-contact-dialog";
import { SiteFeedbackDialog } from "@/app/components/site-feedback-dialog";
import type { FeedbackKind } from "@/app/lib/feedback/actions";
import { createOwnedEvent, createOwnedTeam, deleteOwnedEvent, joinOwnedTeam, setEventAttendance, updateOwnedEvent } from "@/app/lib/team-actions";
import { setAdminTeamWatch } from "@/app/lib/site-admin/actions";
import { mergeDisplayPreferences } from "@/app/lib/display-preferences";
import { isCurrency, normalizeCurrency, type CreateTeamInput } from "@/app/lib/team-defaults";
import {
  formatClock,
  formatDisplayDate,
  formatDuration,
  formatMoney,
  formatMonthTitle,
  formatWeekday,
  hoursBetween,
  isoDate,
  monthGrid,
  parseIsoDate,
  weekdayHeaders,
} from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { EventDetails, VoteCountdown, eventVotingOpen, memberRsvp, type Rsvp } from "@/app/components/event-details";
import { EventFormDialog, type NewEventInput } from "@/app/components/event-form-dialog";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@/app/components/icon-tip-button";
import { EventLineup, type SideMap, type SlotMap } from "@/app/components/event-lineup";
import { SiteFooter } from "@/app/components/site-footer";
import { AdminIntegrationsPage } from "@/app/components/admin-integrations-page";
import { AdminModulesPage } from "@/app/components/admin-modules-page";
import { AdminLanguagesForm } from "@/app/components/admin-languages-form";
import { AdminSettingsForm } from "@/app/components/admin-settings-form";
import { AdminSubteamsList } from "@/app/components/admin-subteams-list";
import { AdminTeamsList } from "@/app/components/admin-teams-list";
import { AdminTranslationsManager } from "@/app/components/admin-translations-manager";
import { AdminEmailDesign } from "@/app/components/admin-email-design";
import { AdminTodoPage } from "@/app/components/admin-todo-page";
import { AdminUsersList } from "@/app/components/admin-users-list";
import { CurrencyProvider, useFormatMoney } from "@/app/components/currency-provider";
import { DisplayPreferencesProvider, useDisplayFormat } from "@/app/components/display-preferences";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { TopBar } from "@/app/components/top-bar";
import type { AccountProfile } from "@/app/lib/auth/profile";
import { FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import type { AdminConsole } from "@/app/lib/site-admin/types";
import { NoTeamStart } from "@/app/components/no-team-start";
import { SubteamAdmin } from "@/app/components/subteam-admin";
import { TeamRoster } from "@/app/components/team-roster";
import { VenueAdmin } from "@/app/components/venue-admin";
import { eventHref, routeFromPathname, teamHref, type AdminSection, type DashboardBase } from "@/app/lib/dashboard-path";
import { eventAudienceIncludes, eventVotingDeadline } from "@/app/lib/event-voting";
import { useTeamCatalog } from "@/app/lib/team-catalog";

type TypeFilter = "all" | EventType;

type DashboardView = "home" | "team" | "subteams" | "venues";

function eventCost(event: TeamEvent, pricePerHour: number): number | null {
  if (event.type === "game" && event.expense != null) return event.expense;
  if (!event.end) return null;
  return hoursBetween(event.start, event.end) * pricePerHour;
}


function EventCardBody({ event, game, cost, subteamName }: { event: TeamEvent; game: boolean; cost: number | null; subteamName?: string }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const { formatTime } = useDisplayFormat();
  const subteam = subteamName;
  const hours = event.end ? hoursBetween(event.start, event.end) : null;
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold ${game ? "text-game" : "text-train"}`}>
            {game ? t("legend.game") : t("legend.training")}
          </p>
          {event.titleId ? <p className="mt-0.5 font-medium">{t(eventTitleKey(event.titleId))}</p> : null}
          {!event.titleId && !game ? <p className="mt-0.5 text-sm">{event.withCoach ? t("event.add.coach") : t("event.add.coach.off")}</p> : null}
        </div>
        {cost != null ? <p className="text-sm font-semibold tabular-nums">{formatMoney(cost)}</p> : null}
      </div>
      <p className="mt-2 text-sm text-muted">
        {hours != null ? `${formatTime(event.start)}-${formatTime(event.end)}, ${formatDuration(hours)}` : formatTime(event.start)}
      </p>
      {subteam ? <p className="mt-1 text-sm">{subteam}</p> : null}
    </>
  );
}

function membersForEvent(event: TeamEvent, roster: Member[]): Member[] {
  const pool = roster.filter((member) => eventAudienceIncludes(event, member));
  return [...pool].sort((a, b) => a.name.localeCompare(b.name, "lv"));
}

function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function eventTitleKey(titleId: string): MessageKey {
  return `event.${titleId}` as MessageKey;
}

export function TeamDashboard({
  basePath,
  account = null,
  admin = null,
  initialTeams = [],
  openTeamId = null,
  enabledModules = null,
}: {
  basePath: DashboardBase;
  account?: AccountProfile | null;
  admin?: AdminConsole | null;
  initialTeams?: IssuedTeam[];
  openTeamId?: string | null;
  enabledModules?: string[] | null;
}) {
  const { formatLang, t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const brand = useSiteBrand();
  const creating = useRef(false);
  const [ownedTeam, setOwnedTeam] = useState<IssuedTeam | null>(() => (account ? (initialTeams[0] ?? null) : null));
  const [teams, setTeams] = useState<IssuedTeam[]>(() => (account ? initialTeams : []));
  const serverTeams = initialTeams.map((team) => `${team.id ?? ""}:${team.watching ? 1 : 0}:${team.leaderId ?? ""}:${team.code}:${team.balance ?? 0}:${(team.rsvps ?? []).map((row) => `${row.eventId}:${row.userId}:${row.status}`).join(",")}:${(team.members ?? []).map((member) => `${member.id}:${member.updatedAt}:${member.balance}:${(member.ledger ?? []).map((entry) => entry.id).join(".")}:${member.feeExempt ? 1 : 0}:${(member.subteamIds ?? []).join(".")}`).join(",")}:${(team.subteams ?? []).map((item) => `${item.id}:${item.name}:${item.color}`).join(",")}:${(team.venues ?? []).map((item) => `${item.id}:${item.name}:${item.pricePerHour}:${item.hidden ? 1 : 0}`).join(",")}:${team.currency ?? ""}:${team.trainingVotingHours ?? 24}:${team.gameVotingHours ?? 72}:${(team.ledger ?? []).map((line) => `${line.id}:${line.amount}`).join(",")}:${(team.events ?? []).map((item) => `${item.id}:${item.date}:${item.start}:${item.expense ?? ""}:${item.type}:${item.venueId}:${item.subteamId}:${item.withCoach ? 1 : 0}`).join(",")}`).join("|");
  const [profile, setProfile] = useState(account);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const needsTeam = Boolean(account) && !ownedTeam;
  const activeTeam = account ? ownedTeam : { name: TEAM_NAME, code: DEMO_INVITE_CODE, demo: true };
  const pathname = usePathname();
  const router = useRouter();
  const route = routeFromPathname(pathname, basePath);
  const view = route.view;
  const showStart = needsTeam && (view === "home" || view === "team" || view === "subteams" || view === "venues");

  async function createTeam(input: CreateTeamInput) {
    if (creating.current) return;
    creating.current = true;
    let result: Awaited<ReturnType<typeof createOwnedTeam>>;
    try {
      result = await createOwnedTeam(input);
    } catch {
      creating.current = false;
      showFeedback({ message: t("auth.error.generic"), variant: "error" });
      return;
    }
    creating.current = false;
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setCurrentTeam(result.team);
    setOwnedTeam(result.team);
    setTeams(listMyTeams());
    showFeedback({ message: t("team.created"), variant: "success" });
    router.push(teamHref(basePath));
    router.refresh();
  }

  function selectTeam(code: string) {
    const team = selectMyTeam(code);
    if (!team) return;
    setOwnedTeam(team);
  }

  async function unwatchTeam(teamId: string) {
    const target = teams.find((item) => item.id === teamId);
    if (!target?.watching) return;
    const result = await setAdminTeamWatch(teamId, false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    forgetTeam(target.code);
    const next = getCurrentTeam();
    setTeams(listMyTeams());
    setOwnedTeam(next);
    showFeedback({ message: t("admin.teams.unwatched"), variant: "success" });
    router.refresh();
  }

  function rememberTeam(patch: { name: string; currency: string | null; trainingVotingHours: number; gameVotingHours: number }) {
    if (!ownedTeam) return;
    const next = { ...ownedTeam, ...patch };
    setCurrentTeam(next);
    setOwnedTeam(next);
    setTeams(listMyTeams());
  }

  function rememberMember(member: Member, teamCode: string) {
    if (!ownedTeam || ownedTeam.code !== teamCode) return;
    const existing = ownedTeam.members ?? [];
    const members = existing.some((item) => item.id === member.id)
      ? existing.map((item) => (item.id === member.id ? member : item))
      : [...existing, member];
    const next = { ...ownedTeam, members };
    setCurrentTeam(next);
    setOwnedTeam(next);
    setTeams(listMyTeams());
    setProfile((current) => {
      if (!current) return current;
      const ehlPlayers = { ...current.ehlPlayers };
      if (member.ehl && member.id === current.id) ehlPlayers[teamCode] = member.ehl;
      else if (member.id === current.id) delete ehlPlayers[teamCode];
      return { ...current, ehlPlayers };
    });
  }

  function forgetMember(id: string) {
    if (!ownedTeam) return;
    const members = (ownedTeam.members ?? []).filter((member) => member.id !== id);
    if (id === profile?.id || members.length === 0) {
      forgetTeam(ownedTeam.code);
      const next = getCurrentTeam();
      setOwnedTeam(next);
      setTeams(listMyTeams());
      router.push(basePath === "/demo" ? "/demo" : "/dashboard");
      router.refresh();
      return;
    }
    const next = { ...ownedTeam, members };
    setCurrentTeam(next);
    setOwnedTeam(next);
    setTeams(listMyTeams());
    router.refresh();
  }

  async function joinTeam(raw: string) {
    const code = normalizeInviteCode(raw);
    if (code === DEMO_INVITE_CODE) {
      const team = findIssuedTeam(code);
      if (!team) {
        showFeedback({ message: t("team.join.not_found"), variant: "error" });
        return;
      }
      setCurrentTeam(team);
      setOwnedTeam(team);
      setTeams(listMyTeams());
      showFeedback({ message: t("team.joined"), variant: "success" });
      router.push(teamHref(basePath));
      return;
    }
    const result = await joinOwnedTeam(code);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setCurrentTeam(result.team);
    setOwnedTeam(result.team);
    setTeams(listMyTeams());
    showFeedback({ message: t("team.joined"), variant: "success" });
    router.push(teamHref(basePath));
    router.refresh();
  }
  const openEventId = route.view === "home" ? route.eventId : null;
  const lineup = route.view === "home" && route.lineup;
  const { subteams, venues, subteamById, venueById } = useTeamCatalog();
  const filterSubteams = activeTeam && !activeTeam.demo && activeTeam.id ? (activeTeam.subteams ?? []) : subteams;
  const todayIso = isoDate(new Date());
  const today = parseIsoDate(todayIso);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [subteamId, setSubteamId] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [homeView, setHomeView] = useState<"calendar" | "poll" | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TeamEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamEvent | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const demo = useSyncExternalStore(subscribeDemoSession, getDemoSession, getDemoSession);
  const demoEvents = demo.events;
  const eventEdits = demo.edits;
  const hiddenEventIds = demo.hidden;
  const demoCharges = demo.charges;
  const demoPlayerDelta = demo.player;
  const demoTeamDelta = demo.team;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactRail, setCompactRail] = useState(false);
  const overlay = compactRail && !sidebarCollapsed;

  useLayoutEffect(() => {
    const narrowQuery = window.matchMedia("(max-width: 1023px)");
    const railQuery = window.matchMedia("(min-width: 600px) and (max-width: 1023px)");
    function sync() {
      setCompactRail(railQuery.matches);
      setSidebarCollapsed(narrowQuery.matches);
      if (window.matchMedia("(min-width: 600px)").matches) setAdminOpen(false);
    }
    sync();
    narrowQuery.addEventListener("change", sync);
    railQuery.addEventListener("change", sync);
    return () => {
      narrowQuery.removeEventListener("change", sync);
      railQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const [savedSlots, setSavedSlots] = useState<Record<string, SlotMap>>({});
  const [savedSides, setSavedSides] = useState<Record<string, SideMap>>({});
  const [rsvp, setRsvp] = useState<Record<string, Record<string, Rsvp>>>(() => {
    const next: Record<string, Record<string, Rsvp>> = {};
    for (const [eventId, rows] of Object.entries(getDemoSession().rsvp)) next[eventId] = { ...rows };
    return next;
  });
  const rsvpRef = useRef(rsvp);
  useEffect(() => {
    rsvpRef.current = rsvp;
  }, [rsvp]);
  const [preferredCode, setPreferredCode] = useState<string | null>(null);
  if (ownedTeam?.code && ownedTeam.code !== preferredCode) setPreferredCode(ownedTeam.code);
  const [appliedTeams, setAppliedTeams] = useState<string | null>(null);
  if (account && serverTeams !== appliedTeams) {
    setAppliedTeams(serverTeams);
    if (!initialTeams.length) {
      setOwnedTeam(null);
      setTeams([]);
      setRsvp({});
    } else {
      const remembered = ownedTeam?.code ?? preferredCode;
      const preferred = remembered && initialTeams.some((team) => team.code === remembered) ? remembered : initialTeams[0].code;
      const next = initialTeams.find((team) => team.code === preferred) ?? initialTeams[0];
      setOwnedTeam(next);
      setTeams(initialTeams);
      const seeded: Record<string, Record<string, Rsvp>> = {};
      for (const row of next.rsvps ?? []) seeded[row.eventId] = { ...seeded[row.eventId], [row.userId]: row.status };
      setRsvp(seeded);
    }
  }
  useEffect(() => {
    if (!account) return;
    replaceMyTeams(initialTeams);
    const remembered = ownedTeam?.code ?? preferredCode;
    const preferred = remembered && initialTeams.some((team) => team.code === remembered) ? remembered : initialTeams[0]?.code;
    if (preferred) selectMyTeam(preferred);
  }, [account, initialTeams, ownedTeam?.code, preferredCode, serverTeams]);
  const pendingAnchor = useRef<string | null>(null);

  const activeSubteamId = subteamId && filterSubteams.some((item) => item.id === subteamId) ? subteamId : null;
  const activeVenueId = venueId && venues.some((item) => item.id === venueId) ? venueId : null;

  const calendarEvents = useMemo(() => {
    const source = basePath === "/demo" ? [...EVENTS, ...demoEvents] : (ownedTeam?.events ?? []);
    return source.filter((event) => !hiddenEventIds.includes(event.id)).map((event) => eventEdits[event.id] ?? event);
  }, [basePath, demoEvents, eventEdits, hiddenEventIds, ownedTeam]);

  const filtered = useMemo(() => {
    return calendarEvents.filter((event) => {
      if (typeFilter !== "all" && event.type !== typeFilter) return false;
      if (activeSubteamId && event.subteamId !== activeSubteamId) return false;
      if (activeVenueId && event.venueId !== activeVenueId) return false;
      return true;
    });
  }, [activeSubteamId, activeVenueId, calendarEvents, typeFilter]);

  const selectedEvents = filtered
    .filter((event) => event.date === selectedIso)
    .sort((a, b) => a.start.localeCompare(b.start));

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TeamEvent[]>();
    for (const event of filtered) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [filtered]);

  const filtersActive = typeFilter !== "all" || activeSubteamId !== null || activeVenueId !== null;

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    const day = Number(selectedIso.slice(8, 10));
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedIso(isoDate(new Date(next.getFullYear(), next.getMonth(), Math.min(day, last))));
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedIso(todayIso);
  }

  function selectDay(date: Date, keepEvent = false) {
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setSelectedIso(isoDate(date));
    if (!keepEvent && openEventId) router.push(basePath);
  }

  function showEvent(event: TeamEvent, date: Date) {
    selectDay(date, true);
    router.push(eventHref(basePath, event.id));
    window.setTimeout(() => {
      document.getElementById("event-details")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }

  async function setMemberRsvp(memberId: string, status: Rsvp, targetEventId?: string) {
    const eventId = targetEventId ?? openEventId;
    if (!eventId) return;
    const previous = rsvp[eventId]?.[memberId] ?? getDemoSession().rsvp[eventId]?.[memberId] ?? "pending";
    updateDemoSession((current) => ({
      ...current,
      rsvp: { ...current.rsvp, [eventId]: { ...current.rsvp[eventId], [memberId]: status } },
    }));
    setRsvp((current) => ({
      ...current,
      [eventId]: { ...current[eventId], [memberId]: status },
    }));
    if (basePath === "/demo" || !ownedTeam?.id) {
      const event = calendarEvents.find((item) => item.id === eventId);
      const price = event ? Math.round((venues.find((item) => item.id === event.venueId)?.pricePerHour ?? 0) * 100) / 100 : 0;
      const member = MEMBERS.find((item) => item.id === memberId);
      const wasGoing = previous === "going";
      const nowGoing = status === "going";
      if (moduleOn(FRONTEND_MODULE_KEYS.finance) && event && member && !member.feeExempt && price > 0 && wasGoing !== nowGoing) {
        const playerStep = nowGoing ? -price : price;
        const teamStep = nowGoing ? price : -price;
        updateDemoSession((current) => ({
          ...current,
          player: { ...current.player, [memberId]: Math.round(((current.player[memberId] ?? 0) + playerStep) * 100) / 100 },
          team: Math.round((current.team + teamStep) * 100) / 100,
        }));
      }
      return;
    }
    const result = await setEventAttendance({ teamId: ownedTeam.id, eventId, userId: memberId, status });
    if ((rsvpRef.current[eventId]?.[memberId] ?? "pending") !== status) return;
    if (!result.ok) {
      updateDemoSession((current) => ({
        ...current,
        rsvp: { ...current.rsvp, [eventId]: { ...current.rsvp[eventId], [memberId]: previous } },
      }));
      setRsvp((current) => ({
        ...current,
        [eventId]: { ...current[eventId], [memberId]: previous },
      }));
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    const members = (ownedTeam.members ?? []).map((member) =>
      member.id === memberId ? { ...member, balance: result.memberBalance, ledger: result.ledger } : member,
    );
    const rsvps = (ownedTeam.rsvps ?? []).filter((row) => !(row.eventId === eventId && row.userId === memberId));
    if (status === "going" || status === "absent") rsvps.push({ eventId, userId: memberId, status });
    const next = { ...ownedTeam, members, balance: result.teamBalance, rsvps };
    setCurrentTeam(next);
    setOwnedTeam(next);
    setTeams(listMyTeams());
    router.refresh();
  }

  function toggleVenue(id: string) {
    setVenueId((current) => (current === id ? null : id));
  }

  function clearFilters() {
    setTypeFilter("all");
    setSubteamId(null);
    setVenueId(null);
  }

  function eventFromInput(id: string, input: NewEventInput, previous?: TeamEvent): TeamEvent {
    return {
      id,
      date: input.date,
      start: input.start,
      end: previous?.end ?? "",
      type: input.type,
      titleId: previous?.titleId ?? "",
      subteamId: input.subteamId ?? "",
      venueId: input.venueId,
      expense: input.expense,
      withCoach: input.withCoach,
    };
  }

  async function addEvent(input: NewEventInput) {
    if (savingEvent) return;
    const editing = editingEvent;
    if (basePath === "/demo" || !ownedTeam?.id) {
      if (editing) {
        const nextEvent = eventFromInput(editing.id, input, editing);
        updateDemoSession((current) => {
          const events = current.events.slice();
          const index = events.findIndex((item) => item.id === editing.id);
          if (index >= 0) events[index] = nextEvent;
          return { ...current, events, edits: { ...current.edits, [editing.id]: nextEvent } };
        });
      } else {
        const created = eventFromInput(crypto.randomUUID(), input);
        updateDemoSession((current) => ({ ...current, events: [...current.events, created] }));
      }
      const picked = parseIsoDate(input.date);
      setYear(picked.getFullYear());
      setMonth(picked.getMonth());
      setSelectedIso(input.date);
      setAddingEvent(false);
      setEditingEvent(null);
      showFeedback({ message: t(editing ? "event.edit.saved" : "event.add.saved"), variant: "success" });
      return;
    }
    setSavingEvent(true);
    let savedTeam: IssuedTeam;
    if (editing) {
      const updated = await updateOwnedEvent({ teamId: ownedTeam.id, eventId: editing.id, ...input });
      setSavingEvent(false);
      if (!updated.ok) {
        showFeedback({ message: t(updated.error), variant: "error" });
        return;
      }
      savedTeam = {
        ...ownedTeam,
        events: (ownedTeam.events ?? []).map((item) => (item.id === updated.event.id ? updated.event : item)),
        balance: updated.teamBalance,
        ledger: updated.ledger,
      };
    } else {
      const created = await createOwnedEvent({ teamId: ownedTeam.id, ...input });
      setSavingEvent(false);
      if (!created.ok) {
        showFeedback({ message: t(created.error), variant: "error" });
        return;
      }
      savedTeam = { ...ownedTeam, events: [...(ownedTeam.events ?? []), created.event] };
    }
    setCurrentTeam(savedTeam);
    setOwnedTeam(savedTeam);
    setTeams(listMyTeams());
    const picked = parseIsoDate(input.date);
    setYear(picked.getFullYear());
    setMonth(picked.getMonth());
    setSelectedIso(input.date);
    setAddingEvent(false);
    setEditingEvent(null);
    showFeedback({ message: t(editing ? "event.edit.saved" : "event.add.saved"), variant: "success" });
    router.refresh();
  }

  function refundDemoEvent(event: TeamEvent) {
    const price = Math.round((venues.find((item) => item.id === event.venueId)?.pricePerHour ?? 0) * 100) / 100;
    updateDemoSession((current) => {
      const rows = current.rsvp[event.id] ?? {};
      const player = { ...current.player };
      let team = current.team;
      for (const [userId, status] of Object.entries(rows)) {
        if (status !== "going" || price <= 0) continue;
        const member = MEMBERS.find((item) => item.id === userId);
        if (!member || member.feeExempt) continue;
        player[userId] = Math.round(((player[userId] ?? 0) + price) * 100) / 100;
        team = Math.round((team - price) * 100) / 100;
      }
      const rsvpRows = { ...current.rsvp };
      delete rsvpRows[event.id];
      const charge = current.charges.find((line) => line.eventId === event.id);
      const charges = charge ? current.charges.filter((line) => line.eventId !== event.id) : current.charges;
      if (charge) team = Math.round((team - charge.amount) * 100) / 100;
      return { ...current, player, team, rsvp: rsvpRows, charges };
    });
    setRsvp((current) => {
      const next = { ...current };
      delete next[event.id];
      return next;
    });
  }

  async function removeEvent(event: TeamEvent) {
    if (savingEvent) return;
    if (basePath === "/demo" || !ownedTeam?.id) {
      refundDemoEvent(event);
      updateDemoSession((current) => {
        const edits = { ...current.edits };
        delete edits[event.id];
        return {
          ...current,
          events: current.events.filter((item) => item.id !== event.id),
          hidden: current.hidden.includes(event.id) ? current.hidden : [...current.hidden, event.id],
          edits,
        };
      });
      setDeleteTarget(null);
      showFeedback({ message: t("event.delete.saved"), variant: "success" });
      router.push(basePath);
      return;
    }
    setSavingEvent(true);
    const result = await deleteOwnedEvent({ teamId: ownedTeam.id, eventId: event.id });
    setSavingEvent(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    const refunded = new Map(result.refunds.map((row) => [row.userId, row]));
    const members = (ownedTeam.members ?? []).map((member) => {
      const refund = refunded.get(member.id);
      return refund ? { ...member, balance: refund.balance, ledger: refund.ledger } : member;
    });
    const next = {
      ...ownedTeam,
      events: (ownedTeam.events ?? []).filter((item) => item.id !== event.id),
      members,
      balance: result.teamBalance,
      ledger: result.ledger,
      rsvps: (ownedTeam.rsvps ?? []).filter((row) => row.eventId !== event.id),
    };
    setCurrentTeam(next);
    setOwnedTeam(next);
    setTeams(listMyTeams());
    setRsvp((current) => {
      const copy = { ...current };
      delete copy[event.id];
      return copy;
    });
    setDeleteTarget(null);
    showFeedback({ message: t("event.delete.saved"), variant: "success" });
    router.push(basePath);
    router.refresh();
  }

  function openLineup(event: TeamEvent) {
    router.push(eventHref(basePath, event.id, true));
    window.scrollTo({ top: 0 });
  }

  function collapseIfNarrow() {
    if (window.matchMedia("(max-width: 1023px)").matches) setSidebarCollapsed(true);
  }

  function showHome(anchor?: string) {
    collapseIfNarrow();
    const onCalendar = view === "home" && !openEventId && !lineup;
    if (onCalendar) {
      if (!anchor) window.scrollTo({ top: 0, behavior: "smooth" });
      else document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    pendingAnchor.current = anchor ?? "";
    router.push(basePath);
  }

  useEffect(() => {
    if (view !== "home" || lineup || pendingAnchor.current === null) return;
    const anchor = pendingAnchor.current;
    pendingAnchor.current = null;
    if (!anchor) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pathname, view, lineup]);

  useEffect(() => {
    if (!openEventId || lineup) return;
    const timer = window.setTimeout(() => {
      document.getElementById("event-details")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [calendarEvents, openEventId, lineup]);

  function showView(next: Exclude<DashboardView, "home">) {
    collapseIfNarrow();
    router.push(`${basePath}/${next}`);
    window.scrollTo({ top: 0 });
  }

  function moduleOn(key: string) {
    if (!enabledModules) return true;
    return enabledModules.includes(key);
  }

  const viewModule: Partial<Record<DashboardView, string>> = {
    subteams: FRONTEND_MODULE_KEYS.subteams,
  };
  const activeModule = view === "admin" ? undefined : viewModule[view];
  const moduleVisible = !activeModule || moduleOn(activeModule);
  const lineupAllowed = moduleOn(FRONTEND_MODULE_KEYS.gameLayout);
  const roster = activeTeam && !activeTeam.demo && activeTeam.members ? activeTeam.members : MEMBERS;
  const knownRsvp = Boolean(activeTeam && !activeTeam.demo && activeTeam.id);
  const financeAllowed = moduleOn(FRONTEND_MODULE_KEYS.finance);
  const lineupBlocked = lineup && !lineupAllowed;
  const rosterCount = !activeTeam || showStart ? 0 : activeTeam.demo || !profile ? MEMBERS.length : activeTeam.members?.length ? activeTeam.members.length : profile ? 1 : 0;
  const subteamCount = showStart ? 0 : filterSubteams.length;
  const venueSource = showStart ? [] : activeTeam && !activeTeam.demo && activeTeam.id ? (activeTeam.venues ?? []) : venues;
  const venueCount = venueSource.filter((item) => !item.hidden).length;
  const adminCounts: Partial<Record<AdminSection, number>> = admin
    ? {
        users: admin.users.length,
        teams: admin.teams.length,
        subteams: admin.subteams.length,
        modules: admin.modules.length,
        integrations: admin.integrations.length,
        languages: admin.languages.length,
        translations: admin.translations.length,
        email: admin.emailTemplates.length,
        todo: admin.todos.filter((item) => !item.isDone).length,
      }
    : {};

  function showAdmin(section: AdminSection) {
    collapseIfNarrow();
    router.push(`${basePath}/admin/${section}`);
    window.scrollTo({ top: 0 });
  }

  const now = useNow();
  const openEventDate = openEventId && !lineup ? (calendarEvents.find((item) => item.id === openEventId)?.date ?? null) : null;
  const [trackedEventDate, setTrackedEventDate] = useState<string | null>(null);
  if (openEventDate && openEventDate !== trackedEventDate) {
    setTrackedEventDate(openEventDate);
    const date = parseIsoDate(openEventDate);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setSelectedIso(openEventDate);
  }
  useEffect(() => {
    if (basePath !== "/demo") return;
    settleDemoCharges(calendarEvents, now);
  }, [basePath, calendarEvents, now]);
  const voteTraining = activeTeam?.trainingVotingHours ?? brand.trainingVotingHours;
  const voteGame = activeTeam?.gameVotingHours ?? brand.gameVotingHours;
  const selfMember = !activeTeam || showStart
    ? null
    : !account || activeTeam.demo
      ? (() => {
          const base = MEMBERS.find((member) => member.id === CURRENT_USER_ID) ?? null;
          if (!base) return null;
          const delta = demoPlayerDelta[base.id] ?? 0;
          return delta ? { ...base, balance: Math.round((base.balance + delta) * 100) / 100 } : base;
        })()
      : (activeTeam.members ?? []).find((member) => member.id === profile?.id) ?? null;
  const pendingVoteEvents = selfMember
    ? calendarEvents
        .filter((event) => {
          if (!eventVotingOpen(event, voteTraining, voteGame, now)) return false;
          if (!eventAudienceIncludes(event, selfMember)) return false;
          const people = membersForEvent(event, roster);
          const index = people.findIndex((member) => member.id === selfMember.id);
          if (index < 0) return false;
          return memberRsvp(event.id, selfMember.id, index, rsvp[event.id], knownRsvp) === "pending";
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    : [];
  const pendingVoteIds = new Set(pendingVoteEvents.map((event) => event.id));
  const resolvedHomeView = homeView ?? (pendingVoteEvents.length > 0 ? "poll" : "calendar");
  const showPoll = resolvedHomeView === "poll" && pendingVoteEvents.length > 0;
  const display = mergeDisplayPreferences(brand.display, profile?.display);
  const currencyCode = activeTeam?.currency && isCurrency(activeTeam.currency) ? activeTeam.currency : normalizeCurrency(brand.currency);
  const money = (value: number) => formatMoney(value, currencyCode);
  const formatDate = (value: string) => formatDisplayDate(value, display);
  const formatTime = (value: string) => formatClock(value, display.timeFormat);
  const dayHeaders = weekdayHeaders(formatLang, display.weekStartDay);
  const cells = monthGrid(year, month, display.weekStartDay);
  const openEvent = openEventId ? calendarEvents.find((event) => event.id === openEventId) ?? null : null;
  const lineupEvent = lineup && openEventId ? calendarEvents.find((event) => event.id === openEventId) ?? null : null;

  return (
    <CurrencyProvider currency={currencyCode}>
    <DisplayPreferencesProvider value={display}>
    <div
      className={`flex min-h-dvh flex-col min-[600px]:grid min-[600px]:min-h-screen min-[600px]:transition-[grid-template-columns] min-[600px]:duration-200 ${account?.isAdmin ? "min-[600px]:grid-cols-[var(--side)_minmax(0,1fr)_3.5rem]" : "min-[600px]:grid-cols-[var(--side)_minmax(0,1fr)]"}`}
      style={{ "--side": overlay || sidebarCollapsed ? "3.5rem" : "15rem" } as CSSProperties}
    >
      {overlay ? (
        <button
          type="button"
          aria-label={t("sidebar.collapse")}
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm"
        />
      ) : null}
      <div className={overlay ? "relative z-40" : "contents"}>
      <aside className={overlay ? "fixed top-0 left-0 z-40 flex h-screen w-60 flex-col overflow-hidden bg-navy text-white shadow-xl" : `order-2 overflow-hidden bg-navy text-white max-[599px]:fixed max-[599px]:bottom-0 max-[599px]:left-0 max-[599px]:z-50 max-[599px]:flex max-[599px]:h-auto max-[599px]:w-full max-[599px]:flex-row max-[599px]:overflow-visible max-[599px]:pb-[env(safe-area-inset-bottom)] min-[600px]:sticky min-[600px]:top-0 min-[600px]:z-20 min-[600px]:order-none min-[600px]:flex min-[600px]:h-screen min-[600px]:flex-col ${sidebarCollapsed ? "min-[600px]:overflow-hidden" : "min-[600px]:overflow-x-hidden min-[600px]:overflow-y-auto"}`}>
        <div className="hidden items-center gap-2 overflow-hidden px-2.5 py-4 min-[600px]:flex">
          <button
            type="button"
            aria-label={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            title={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-white/10"
          >
            {sidebarCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
          <span className={`min-w-0 items-center gap-2 whitespace-nowrap ${sidebarCollapsed ? "sr-only" : "flex"}`}>
            {brand.logoUrl ? <ContentImage src={brand.logoUrl} className="h-7 w-auto shrink-0" /> : null}
            <p className="truncate text-base font-semibold tracking-wide">{brand.name}</p>
          </span>
        </div>
        <nav
          className={`flex flex-wrap gap-1 pb-3 max-[599px]:w-full max-[599px]:flex-nowrap max-[599px]:items-stretch max-[599px]:justify-around max-[599px]:gap-0.5 max-[599px]:px-1 max-[599px]:py-1.5 min-[600px]:min-h-0 min-[600px]:flex-1 min-[600px]:flex-col min-[600px]:flex-nowrap min-[600px]:items-stretch min-[600px]:overflow-x-hidden min-[600px]:pb-4 ${sidebarCollapsed ? "min-[600px]:px-2.5" : "min-[600px]:overflow-y-auto min-[600px]:pr-4 min-[600px]:pl-2.5"}`}
          aria-label={t("nav.sections")}
        >
          <SideItem label={t("nav.home")} icon={<IconCalendar />} active={view === "home"} compact={sidebarCollapsed} onClick={() => showHome("kalendars")} />
          <SideItem label={t("nav.members")} count={rosterCount} icon={<IconUsers />} active={view === "team"} compact={sidebarCollapsed} onClick={() => showView("team")} />
          {moduleOn(FRONTEND_MODULE_KEYS.subteams) ? <SideItem label={t("nav.subteams")} count={subteamCount} icon={<IconLayers />} active={view === "subteams"} compact={sidebarCollapsed} onClick={() => showView("subteams")} /> : null}
          <SideItem label={t("nav.venues")} count={venueCount} icon={<IconPin />} active={view === "venues"} compact={sidebarCollapsed} onClick={() => showView("venues")} />
        </nav>
        {account ? (
          <nav
            aria-label={t("nav.help")}
            className={`mt-auto hidden shrink-0 flex-col gap-1 overflow-hidden border-t border-white/15 pt-3 pb-3 min-[600px]:flex ${sidebarCollapsed ? "px-2.5" : "pr-4 pl-2.5"}`}
          >
            <SideItem label={t("nav.report_bug")} icon={<IconBug />} compact={sidebarCollapsed} onClick={() => setFeedbackKind("bug")} />
            <SideItem label={t("nav.suggestions")} icon={<IconBulb />} compact={sidebarCollapsed} onClick={() => setFeedbackKind("suggestion")} />
            <SideItem label={t("nav.feedback")} icon={<IconComment />} compact={sidebarCollapsed} onClick={() => setFeedbackKind("feedback")} />
            <SideItem label={t("landing.nav.contact")} icon={<IconMail />} compact={sidebarCollapsed} onClick={() => setContactOpen(true)} />
          </nav>
        ) : null}
      </aside>
      {account && menuOpen ? (
        <div className="fixed top-14 right-0 bottom-0 left-0 z-40 min-[600px]:hidden">
          <button type="button" aria-label={t("event.close")} className="absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute top-0 right-auto bottom-0 left-0 z-10 flex w-64 flex-col bg-navy text-white shadow-xl">
            <nav aria-label={t("nav.help")} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pt-3 pr-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
              <SideItem label={t("nav.report_bug")} icon={<IconBug />} row onClick={() => { setMenuOpen(false); setFeedbackKind("bug"); }} />
              <SideItem label={t("nav.suggestions")} icon={<IconBulb />} row onClick={() => { setMenuOpen(false); setFeedbackKind("suggestion"); }} />
              <SideItem label={t("nav.feedback")} icon={<IconComment />} row onClick={() => { setMenuOpen(false); setFeedbackKind("feedback"); }} />
              <SideItem label={t("landing.nav.contact")} icon={<IconMail />} row onClick={() => { setMenuOpen(false); setContactOpen(true); }} />
            </nav>
          </aside>
        </div>
      ) : null}
      <SiteFeedbackDialog kind={feedbackKind} onClose={() => setFeedbackKind(null)} />
      {contactOpen && profile ? <SiteContactDialog account={profile} onClose={() => setContactOpen(false)} /> : null}
      </div>

      <div className="flex min-h-screen min-w-0 flex-col max-[599px]:contents">
      <TopBar
        key={ownedTeam ? teamPlayer(profile, ownedTeam.code)?.sourceUrl ?? ownedTeam.code : "account"}
        account={profile}
        team={activeTeam ? { name: activeTeam.name, code: activeTeam.code, logoUrl: activeTeam.logoUrl } : null}
        teams={account ? teams : []}
        onHome={() => showHome()}
        onSelectTeam={selectTeam}
        onUnwatchTeam={account?.isAdmin ? unwatchTeam : undefined}
        onCreateTeam={createTeam}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        onAccountChange={setProfile}
        onOpenFeedback={account ? setFeedbackKind : undefined}
        onOpenContact={account ? () => setContactOpen(true) : undefined}
        onOpenMenu={account ? () => { setAdminOpen(false); setMenuOpen((value) => !value); } : undefined}
        onOpenAdmin={account?.isAdmin ? () => { setMenuOpen(false); setAdminOpen((value) => !value); } : undefined}
        balanceMember={financeAllowed ? selfMember : null}
        calendarIntegration={Boolean(enabledModules?.includes(FRONTEND_MODULE_KEYS.calendar))}
      />
      <main className="order-3 flex-1 px-4 py-5 sm:px-6 lg:order-none lg:px-8 lg:py-7">
        {account && ownedTeam && !ownedTeam.watching && !teamPlayer(profile, ownedTeam.code) && route.view !== "admin" && !showStart ? (
          <PlayerLinkHint teamCode={ownedTeam.code} onOpen={() => setSettingsOpen(true)} />
        ) : null}
        {!showStart && pendingVoteEvents.length ? (
          <div role="status" className="mb-4 rounded-2xl bg-game-soft px-4 py-3 ring-1 ring-line">
            <p className="text-sm font-medium">{t("event.vote.needed")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {pendingVoteEvents.slice(0, 6).map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => showEvent(event, parseIsoDate(event.date))}
                    className="rounded-lg bg-paper px-2.5 py-1 text-sm tabular-nums hover:ring-1 hover:ring-line"
                  >
                    {formatDate(event.date)} {formatTime(event.start)} {t(event.type === "game" ? "legend.game" : "legend.training")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {showStart ? <NoTeamStart onCreate={createTeam} onJoin={joinTeam} /> : null}
        {((!moduleVisible && route.view !== "admin") || lineupBlocked) && !showStart ? (
          <p className="rounded-2xl bg-paper px-4 py-8 text-sm text-muted ring-1 ring-line">{t("frontend_modules.disabled")}</p>
        ) : null}
        {view === "home" && lineupEvent && lineupAllowed && !showStart && moduleVisible ? (
          <EventLineup
            key={lineupEvent.id}
            event={lineupEvent}
            members={membersForEvent(lineupEvent, roster)}
            venueName={venueSource.find((item) => item.id === lineupEvent.venueId)?.name ?? ""}
            subteamName={filterSubteams.find((item) => item.id === lineupEvent.subteamId)?.name ?? ""}
            knownRsvp={knownRsvp}
            rsvp={rsvp[lineupEvent.id]}
            savedSlots={savedSlots[lineupEvent.id] ?? {}}
            savedSides={savedSides[lineupEvent.id] ?? {}}
            onSaveSlots={(slots) => setSavedSlots((current) => ({ ...current, [lineupEvent.id]: slots }))}
            onSaveSides={(sides) => setSavedSides((current) => ({ ...current, [lineupEvent.id]: sides }))}
            onBack={() => router.push(eventHref(basePath, lineupEvent.id))}
          />
        ) : null}
        {view === "team" && !showStart && activeTeam && moduleVisible ? (
          <TeamRoster
            key={activeTeam.code}
            teamName={activeTeam.name}
            inviteCode={activeTeam.code}
            sourceUrl={activeTeam.sourceUrl}
            logoUrl={activeTeam.logoUrl}
            teamId={activeTeam.id ?? null}
            leaderId={activeTeam.leaderId ?? null}
            accountId={profile?.id ?? null}
            trainingVotingHours={activeTeam.trainingVotingHours ?? brand.trainingVotingHours}
            gameVotingHours={activeTeam.gameVotingHours ?? brand.gameVotingHours}
            currency={activeTeam.currency ?? null}
            onTeamSaved={rememberTeam}
            initialMembers={(activeTeam.demo || !profile ? MEMBERS : activeTeam.members?.length ? activeTeam.members : [creatorMember(profile, activeTeam.code)]).map((member) => {
              const delta = activeTeam.demo ? demoPlayerDelta[member.id] : 0;
              if (!delta) return member;
              return { ...member, balance: Math.round((member.balance + delta) * 100) / 100 };
            })}
            memberId={route.view === "team" ? route.memberId : null}
            onOpenMember={(id) => router.push(teamHref(basePath, id))}
            onCloseMember={() => router.push(teamHref(basePath))}
            subteams={activeTeam.demo ? undefined : (activeTeam.subteams ?? [])}
            onMemberSaved={rememberMember}
            onMemberRemoved={forgetMember}
            finance={financeAllowed}
            persistedBalance={activeTeam.demo ? demoTeamDelta : (activeTeam.balance ?? 0)}
            persistedEntries={(activeTeam.demo ? demoCharges : (activeTeam.ledger ?? [])).map((line) => ({
              id: line.id,
              amount: line.amount,
              at: line.at,
              description: t("team.ledger.event", {
                type: t(line.eventType === "game" ? "legend.game" : "legend.training"),
                date: formatDate(line.eventDate),
              }),
            }))}
          />
        ) : null}
        {view === "subteams" && !showStart && moduleVisible ? (
          <SubteamAdmin
            teamId={activeTeam && !activeTeam.demo ? (activeTeam.id ?? null) : null}
            readOnly={Boolean(activeTeam?.watching)}
            subteams={activeTeam?.subteams}
            onChange={(subteams) => {
              if (!ownedTeam) return;
              const next = { ...ownedTeam, subteams };
              setCurrentTeam(next);
              setOwnedTeam(next);
              setTeams(listMyTeams());
            }}
          />
        ) : null}
        {view === "venues" && !showStart && moduleVisible ? (
          <VenueAdmin
            teamId={activeTeam && !activeTeam.demo ? (activeTeam.id ?? null) : null}
            readOnly={Boolean(activeTeam?.watching)}
            venues={activeTeam?.venues}
            onChange={(venues) => {
              if (!ownedTeam) return;
              const next = { ...ownedTeam, venues };
              setCurrentTeam(next);
              setOwnedTeam(next);
              setTeams(listMyTeams());
            }}
          />
        ) : null}
        {route.view === "admin" ? (
          <div className="space-y-6">
            {admin && (route.section === "users" || route.section === "teams" || route.section === "subteams" || route.section === "modules") ? null : (
              <h1 className="text-2xl font-semibold tracking-tight">{t(ADMIN_LABEL[route.section])}</h1>
            )}
            {route.section === "users" && admin ? <AdminUsersList users={admin.users} /> : null}
            {route.section === "teams" && admin ? (
              <AdminTeamsList teams={admin.teams} subteams={admin.subteams} members={admin.members} openTeamId={openTeamId} accountId={account?.id ?? ""} watchedTeamIds={admin.watchedTeamIds} />
            ) : null}
            {route.section === "subteams" && admin ? <AdminSubteamsList teams={admin.teams} subteams={admin.subteams} /> : null}
            {route.section === "modules" && admin ? <AdminModulesPage initialModules={admin.modules} /> : null}
            {route.section === "integrations" && admin ? (
              <AdminIntegrationsPage integrations={admin.integrations} googleRedirectUrl={admin.googleRedirectUrl} />
            ) : null}
            {route.section === "settings" && admin ? <AdminSettingsForm initial={admin.brand} /> : null}
            {route.section === "languages" && admin ? <AdminLanguagesForm initialLanguages={admin.languages} /> : null}
            {route.section === "translations" && admin ? (
              <AdminTranslationsManager translations={admin.translations} languages={admin.languages} />
            ) : null}
            {route.section === "email" && admin ? (
              <AdminEmailDesign
                systemName={admin.brand.name}
                resendEnabled={admin.integrations.some((item) => item.key === "resend" && item.enabled)}
                languages={admin.languages}
                initialTemplates={admin.emailTemplates}
              />
            ) : null}
            {route.section === "todo" && admin ? <AdminTodoPage initialTodos={admin.todos} /> : null}
          </div>
        ) : null}
        <div className={view === "home" && !lineupEvent && !showStart && moduleVisible ? undefined : "hidden"}>
        {pendingVoteEvents.length ? (
          <div className="mb-4">
            <CalendarPollSwitch value={resolvedHomeView} onChange={setHomeView} />
          </div>
        ) : null}
        <section id="kalendars" className={`scroll-mt-4 ${showPoll ? "space-y-4" : "grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"}`}>
          {showPoll ? (
            <>
              <ul className="space-y-4">
                {pendingVoteEvents.map((event) => {
                  const venue = venueSource.find((item) => item.id === event.venueId);
                  const busy = votingId === event.id;
                  return (
                    <li key={event.id} className="rounded-2xl bg-paper p-5 ring-1 ring-line">
                      <dl className="grid gap-3 min-[600px]:grid-cols-2">
                        <PollField label={t("event.date")} value={`${formatWeekday(event.date, formatLang)} ${formatDate(event.date)} ${formatTime(event.start)}`} />
                        <PollField label={t("event.price")} value={venue ? money(venue.pricePerHour) : ""} large />
                        <PollField label={t("event.type")} value={t(event.type === "game" ? "legend.game" : "legend.training")} />
                        <PollField label={t("event.venue")} value={venue?.name ?? ""} />
                      </dl>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={busy || !selfMember}
                          onClick={() => {
                            if (!selfMember) return;
                            setVotingId(event.id);
                            void setMemberRsvp(selfMember.id, "going", event.id).finally(() => setVotingId(null));
                          }}
                          className="rounded-xl bg-[#178a45] px-4 py-4 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t("event.vote.going")}
                        </button>
                        <button
                          type="button"
                          disabled={busy || !selfMember}
                          onClick={() => {
                            if (!selfMember) return;
                            setVotingId(event.id);
                            void setMemberRsvp(selfMember.id, "absent", event.id).finally(() => setVotingId(null));
                          }}
                          className="rounded-xl bg-game px-4 py-4 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t("event.vote.absent")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
          <div className={`rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5 ${showPoll ? "hidden" : ""}`}>
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <IconButton label={t("month.prev")} onClick={() => shiftMonth(-1)}>
                  <Chevron direction="left" />
                </IconButton>
                <h2 className="min-w-40 text-center text-lg font-semibold">{formatMonthTitle(year, month, formatLang)}</h2>
                <IconButton label={t("month.next")} onClick={() => shiftMonth(1)}>
                  <Chevron direction="right" />
                </IconButton>
                <button
                  type="button"
                  onClick={goToday}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-train hover:bg-train-soft"
                >
                  {t("today")}
                </button>
              </div>
              <div className="flex w-full items-center gap-2 max-[499px]:flex-nowrap max-[499px]:gap-1.5">
                <TypeSwitch value={typeFilter} onChange={setTypeFilter} />
                <label className="sr-only" htmlFor="subteam-filter">
                  {t("filter.subteam")}
                </label>
                <select
                  id="subteam-filter"
                  value={subteamId ?? ""}
                  onChange={(event) => setSubteamId(event.target.value || null)}
                  className="ml-auto w-fit max-w-full rounded-lg bg-ice px-3 py-2 text-sm text-ink ring-1 ring-line max-[499px]:px-2 max-[499px]:py-1 max-[499px]:text-xs"
                >
                  <option value="">{t("filter.allSubteams")}</option>
                  {filterSubteams.map((subteam) => (
                    <option key={subteam.id} value={subteam.id}>
                      {subteam.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filtersActive ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                {typeFilter !== "all" ? (
                  <FilterChip label={typeFilter === "game" ? t("filter.gamesOnly") : t("filter.trainingsOnly")} onClear={() => setTypeFilter("all")} />
                ) : null}
                {activeSubteamId ? (
                  <FilterChip label={filterSubteams.find((item) => item.id === activeSubteamId)?.name ?? subteamById(activeSubteamId)?.name ?? ""} onClear={() => setSubteamId(null)} />
                ) : null}
                {activeVenueId ? (
                  <FilterChip label={venueById(activeVenueId)?.name ?? ""} onClear={() => setVenueId(null)} />
                ) : null}
                <button type="button" onClick={clearFilters} className="px-2 py-1 text-train hover:underline">
                  {t("filter.clear")}
                </button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-grid">
              <div className="grid grid-cols-7 bg-[#f4f7fa]">
                {dayHeaders.map((label, index) => (
                  <div
                    key={label}
                    className={`border-b border-grid px-1 py-2 text-center text-xs font-medium text-muted ${
                      index < 6 ? "border-r" : ""
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((date, index) => {
                  const iso = isoDate(date);
                  const inMonth = date.getMonth() === month;
                  const events = eventsByDate.get(iso) ?? [];
                  const selected = iso === selectedIso;
                  const isToday = iso === todayIso;
                  const column = index % 7;
                  const lastRow = index >= 35;
                  return (
                    <div
                      key={iso}
                      onClick={() => selectDay(date)}
                      className={`flex min-h-16 cursor-pointer flex-col border-grid px-1.5 py-1.5 text-left sm:min-h-[104px] sm:px-2 ${
                        column < 6 ? "border-r" : ""
                      } ${lastRow ? "" : "border-b"} ${selected ? "bg-[#e7eef4]" : inMonth ? "bg-paper hover:bg-ice" : "bg-[#f6f8fa] hover:bg-ice"}`}
                    >
                      <button
                        type="button"
                        onClick={(click) => {
                          click.stopPropagation();
                          selectDay(date);
                        }}
                        aria-pressed={selected}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={formatDate(iso)}
                        className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${
                          isToday ? "bg-train text-white" : inMonth ? "text-ink" : "text-muted"
                        }`}
                      >
                        {date.getDate()}
                      </button>
                      <span className="flex flex-col gap-1">
                        {events.slice(0, 2).map((event) => {
                          const venue = venueSource.find((item) => item.id === event.venueId);
                          const place = venue?.area.split(",")[0] || venue?.name || "";
                          const label = `${formatTime(event.start)} ${place}`.trim();
                          return (
                            <button
                              key={event.id}
                              type="button"
                              onClick={(click) => {
                                click.stopPropagation();
                                showEvent(event, date);
                              }}
                              className={`truncate rounded border-l-2 px-1 py-0.5 text-left text-[11px] leading-4 max-[499px]:px-0.5 max-[499px]:text-[9px] max-[499px]:leading-3 max-[499px]:text-clip ${
                                event.type === "game"
                                  ? "border-game bg-game-soft text-game"
                                  : "border-train bg-train-soft text-train"
                              } ${openEventId === event.id ? "ring-1 ring-navy" : ""} ${pendingVoteIds.has(event.id) ? "vote-pulse" : ""}`}
                            >
                              <span className="max-[499px]:hidden">{label}</span>
                              <span className="hidden tabular-nums max-[499px]:inline">{formatTime(event.start)}</span>
                            </button>
                          );
                        })}
                        {events.length > 2 ? <span className="text-[11px] text-muted">+{events.length - 2}</span> : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-game" /> {t("legend.game")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-train" /> {t("legend.training")}
              </span>
            </div>
          </div>

          <div className={`flex flex-col gap-3 xl:sticky xl:top-5 ${showPoll ? "hidden" : ""}`}>
          {activeTeam?.watching ? null : (
            <button type="button" onClick={() => setAddingEvent(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
              <IconPlus />
              {t("event.add")}
            </button>
          )}
          <aside className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{formatWeekday(selectedIso, formatLang)}</p>
            <h2 className="mt-1 text-lg font-semibold">{formatDate(selectedIso)}</h2>
            {selectedEvents.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                {filtersActive ? t("day.emptyFiltered") : t("day.empty")}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {selectedEvents.map((event) => {
                  const venue = venueSource.find((item) => item.id === event.venueId);
                  const cost = eventCost(event, venue?.pricePerHour ?? 0);
                  const subteamName = filterSubteams.find((item) => item.id === event.subteamId)?.name;
                  const game = event.type === "game";
                  return (
                    <li key={event.id} className={`rounded-xl bg-ice p-3 ${lineup && lineupEvent?.id === event.id ? "ring-1 ring-navy" : ""}`}>
                      {lineupAllowed ? (
                        <button type="button" onClick={() => openLineup(event)} className="w-full text-left">
                          <EventCardBody event={event} game={game} cost={cost} subteamName={subteamName} />
                        </button>
                      ) : (
                        <div>
                          <EventCardBody event={event} game={game} cost={cost} subteamName={subteamName} />
                        </div>
                      )}
                      {venue ? (
                        <button
                          type="button"
                          onClick={() => toggleVenue(event.venueId)}
                          className="mt-1 text-left text-sm text-train hover:underline"
                        >
                          {venue.name}
                        </button>
                      ) : null}
                      {event.end ? (
                        <p className="mt-1 text-xs text-muted">
                          {formatDuration(hoursBetween(event.start, event.end))} × {money(venue?.pricePerHour ?? 0)}/h
                        </p>
                      ) : null}
                      <VoteCountdown deadline={eventVotingDeadline(event, voteTraining, voteGame)} className="mt-2" />
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
          </div>
        </section>
        {addingEvent || editingEvent ? (
          <EventFormDialog
            key={editingEvent?.id ?? selectedIso}
            initialDate={editingEvent?.date ?? selectedIso}
            event={editingEvent}
            venues={venueSource.filter((item) => !item.hidden)}
            subteams={filterSubteams}
            pending={savingEvent}
            onClose={() => {
              setAddingEvent(false);
              setEditingEvent(null);
            }}
            onCreate={(input) => void addEvent(input)}
          />
        ) : null}
        {openEvent ? (
          <EventDetails
            event={openEvent}
            members={membersForEvent(openEvent, roster)}
            venueName={venueSource.find((item) => item.id === openEvent.venueId)?.name ?? ""}
            fee={venueSource.find((item) => item.id === openEvent.venueId)?.pricePerHour ?? 0}
            voteDeadline={eventVotingDeadline(openEvent, voteTraining, voteGame)}
            knownRsvp={knownRsvp}
            actorId={profile && activeTeam && !activeTeam.demo ? profile.id : null}
            leader={Boolean(profile && activeTeam && !activeTeam.demo && activeTeam.leaderId === profile.id)}
            votingOpen={eventVotingOpen(openEvent, voteTraining, voteGame)}
            rsvp={rsvp[openEvent.id]}
            onRsvp={setMemberRsvp}
            onLineup={lineupAllowed ? () => openLineup(openEvent) : undefined}
            onEdit={basePath === "/demo" || (profile && activeTeam && !activeTeam.demo && activeTeam.leaderId === profile.id) ? () => setEditingEvent(openEvent) : undefined}
            onDelete={basePath === "/demo" || (profile && activeTeam && !activeTeam.demo && activeTeam.leaderId === profile.id) ? () => setDeleteTarget(openEvent) : undefined}
            onClose={() => router.push(basePath)}
          />
        ) : null}
        {deleteTarget ? (
          <AdminDialog open title={t("event.delete.title")} onClose={() => { if (!savingEvent) setDeleteTarget(null); }}>
            <p className="text-sm text-muted">{t("event.delete.confirm")}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={savingEvent} onClick={() => setDeleteTarget(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
                {t("actions.cancel")}
              </button>
              <button type="button" disabled={savingEvent} onClick={() => void removeEvent(deleteTarget)} className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                {t("actions.delete")}
              </button>
            </div>
          </AdminDialog>
        ) : null}
        </div>
      </main>
      <div className="order-4 bg-paper max-[599px]:pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <SiteFooter />
      </div>
      </div>
      {account?.isAdmin && adminOpen ? (
        <button type="button" aria-label={t("sidebar.collapse")} onClick={() => setAdminOpen(false)} className="fixed top-14 right-0 bottom-0 left-0 z-20 bg-ink/40 min-[600px]:hidden" />
      ) : null}
      {account?.isAdmin ? (
        <div className="max-[599px]:contents min-[600px]:sticky min-[600px]:top-0 min-[600px]:z-40 min-[600px]:h-screen min-[600px]:self-start min-[600px]:overflow-visible">
        <aside
          aria-label={t("nav.admin")}
          className={`group/admin z-40 flex-col overflow-hidden bg-navy text-white transition-[width] duration-200 max-[599px]:fixed max-[599px]:top-14 max-[599px]:right-0 max-[599px]:bottom-0 max-[599px]:h-auto max-[599px]:w-72 max-[599px]:shadow-xl min-[600px]:absolute min-[600px]:top-0 min-[600px]:right-0 min-[600px]:flex min-[600px]:h-full min-[600px]:w-14 min-[600px]:hover:w-60 min-[600px]:hover:shadow-xl min-[600px]:focus-within:w-60 ${adminOpen ? "max-[599px]:flex" : "max-[599px]:hidden"}`}
        >
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto py-3 pr-4 pl-2.5 max-[599px]:pt-3 max-[599px]:pb-[calc(5.5rem+env(safe-area-inset-bottom))] min-[600px]:pr-2.5 min-[600px]:group-hover/admin:pr-4 min-[600px]:group-focus-within/admin:pr-4">
            {ADMIN_NAV.map((item) => (
              <SideItem
                key={item.section}
                label={t(item.label)}
                count={adminCounts[item.section]}
                icon={item.icon}
                active={route.view === "admin" && route.section === item.section}
                flush
                onClick={() => {
                  setAdminOpen(false);
                  showAdmin(item.section);
                }}
              />
            ))}
          </nav>
        </aside>
        </div>
      ) : null}
    </div>
    </DisplayPreferencesProvider>
    </CurrencyProvider>
  );
}

const ADMIN_LABEL: Record<AdminSection, MessageKey> = {
  users: "nav.admin.users",
  teams: "nav.admin.teams",
  subteams: "nav.subteams",
  settings: "user.settings",
  modules: "nav.admin.modules",
  integrations: "nav.admin.integrations",
  languages: "nav.admin.languages",
  translations: "nav.admin.translations",
  email: "nav.admin.email",
  todo: "nav.admin.todo",
};

const ADMIN_NAV: { section: AdminSection; label: MessageKey; icon: ReactNode }[] = [
  { section: "users", label: ADMIN_LABEL.users, icon: <IconUsers /> },
  { section: "teams", label: ADMIN_LABEL.teams, icon: <IconTeams /> },
  { section: "subteams", label: ADMIN_LABEL.subteams, icon: <IconLayers /> },
  { section: "settings", label: ADMIN_LABEL.settings, icon: <IconGear /> },
  { section: "modules", label: ADMIN_LABEL.modules, icon: <IconModules /> },
  { section: "integrations", label: ADMIN_LABEL.integrations, icon: <IconPlug /> },
  { section: "languages", label: ADMIN_LABEL.languages, icon: <IconLanguages /> },
  { section: "translations", label: ADMIN_LABEL.translations, icon: <IconTranslations /> },
  { section: "email", label: ADMIN_LABEL.email, icon: <IconMail /> },
  { section: "todo", label: ADMIN_LABEL.todo, icon: <IconTodo /> },
];

function SideItem({
  label,
  count,
  icon,
  active,
  compact,
  row = false,
  flush = false,
  onClick,
}: {
  label: string;
  count?: number;
  icon: ReactNode;
  active?: boolean;
  compact?: boolean;
  row?: boolean;
  flush?: boolean;
  onClick: () => void;
}) {
  const caption = count == null ? label : `${label} ${count}`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  function placeTip() {
    if (!compact || window.matchMedia("(max-width: 599px)").matches) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  }

  return (
    <>
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onMouseEnter={placeTip}
      onMouseLeave={() => setTip(null)}
      onFocus={placeTip}
      onBlur={() => setTip(null)}
      aria-current={active ? "page" : undefined}
      aria-label={caption}
      className={`relative text-white/90 hover:bg-white/10 ${
        flush
          ? "inline-flex w-full flex-none flex-row items-center gap-2 overflow-hidden rounded-xl py-0 text-left text-sm"
          : row
            ? "inline-flex w-full flex-none flex-row items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm"
            : "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center text-[11px] leading-tight min-[600px]:inline-flex min-[600px]:w-full min-[600px]:flex-none min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-start min-[600px]:gap-2 min-[600px]:overflow-hidden min-[600px]:rounded-xl min-[600px]:px-0 min-[600px]:py-0 min-[600px]:text-left min-[600px]:text-sm"
      } ${active ? "bg-white/15" : ""}`}
    >
      <span className="inline-grid h-9 w-9 shrink-0 place-items-center [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <span className={flush || row ? "min-w-0 flex-1 truncate" : `whitespace-nowrap min-[600px]:min-w-0 min-[600px]:flex-1 min-[600px]:truncate ${compact ? "min-[600px]:sr-only" : ""}`}>{label}</span>
      {count != null ? <span className={`shrink-0 text-xs tabular-nums whitespace-nowrap text-white/55 ${flush || row ? "pr-4" : compact ? "sr-only" : "hidden pr-4 min-[600px]:inline"}`}>{count}</span> : null}
    </button>
    {tip
      ? createPortal(
          <span role="tooltip" style={{ top: tip.top, left: tip.left }} className="pointer-events-none fixed z-[70] -translate-y-1/2 rounded-md bg-paper px-2 py-1 text-xs font-medium whitespace-nowrap text-ink ring-1 ring-line">
            {caption}
          </span>,
          document.body,
        )
      : null}
    </>
  );
}

function CalendarPollSwitch({ value, onChange }: { value: "calendar" | "poll"; onChange: (value: "calendar" | "poll") => void }) {
  const { t } = useLanguage();
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  const options = [
    { id: "calendar" as const, label: t("event.vote.calendar_view"), icon: <IconCalendar /> },
    { id: "poll" as const, label: t("event.vote.poll_view"), icon: <IconPoll /> },
  ];

  function place(target: HTMLButtonElement, text: string) {
    const box = target.getBoundingClientRect();
    const below = box.top < 40;
    const x = Math.min(window.innerWidth - 12, Math.max(12, box.left + box.width / 2));
    setTip({ text, x, y: below ? box.bottom + 6 : box.top - 6, below });
  }

  return (
    <div className="inline-flex w-fit rounded-lg bg-paper p-1 shadow-sm ring-1 ring-line" role="group" aria-label={t("event.vote.view")}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          aria-label={option.label}
          onClick={() => onChange(option.id)}
          onMouseEnter={(event) => place(event.currentTarget, option.label)}
          onMouseLeave={() => setTip(null)}
          onFocus={(event) => place(event.currentTarget, option.label)}
          onBlur={() => setTip(null)}
          className={`grid h-9 w-11 place-items-center rounded-md ${value === option.id ? "bg-navy text-white shadow-sm" : "text-muted hover:bg-ice hover:text-ink"}`}
        >
          {option.icon}
        </button>
      ))}
      {tip ? (
        <span
          role="tooltip"
          style={{ left: tip.x, top: tip.y, transform: tip.below ? "translateX(-50%)" : "translate(-50%, -100%)" }}
          className="pointer-events-none fixed z-40 rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
        >
          {tip.text}
        </span>
      ) : null}
    </div>
  );
}

function PollField({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={large ? "mt-0.5 text-2xl font-semibold tabular-nums text-ink" : "mt-0.5 text-sm font-medium text-ink"}>{value || "—"}</dd>
    </div>
  );
}

function TypeSwitch({ value, onChange }: { value: TypeFilter; onChange: (value: TypeFilter) => void }) {
  const { t } = useLanguage();
  const options: { id: TypeFilter; label: string }[] = [
    { id: "all", label: t("type.all") },
    { id: "game", label: t("type.games") },
    { id: "training", label: t("type.trainings") },
  ];
  return (
    <div className="inline-flex shrink-0 rounded-lg bg-ice p-1 ring-1 ring-line max-[499px]:p-0.5" role="group" aria-label={t("type.group")}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-md px-3 py-1.5 text-sm max-[499px]:px-1.5 max-[499px]:py-1 max-[499px]:text-xs ${
            value === option.id ? "bg-paper font-medium shadow-sm" : "text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full bg-ice px-2.5 py-1 text-ink ring-1 ring-line"
    >
      {label}
      <span aria-hidden="true">×</span>
      <span className="sr-only">{t("filter.remove", { label })}</span>
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-ice"
    >
      {children}
    </button>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {direction === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

function IconPoll() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

function IconBug() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 8a4 4 0 1 1 8 0v2a4 4 0 0 1-8 0V8z" />
      <path d="M12 14v6M5 10H3M21 10h-2M6 18l-2 2M18 18l2 2M7 7 5 5M17 7l2-2" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18h6M10 21h4" />
      <path d="M8 14a6 6 0 1 1 8 0c-.8.8-1.5 1.6-1.7 2.5h-4.6C9.5 15.6 8.8 14.8 8 14z" />
    </svg>
  );
}

function IconComment() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 6h14v10H8l-3 3V6z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.75" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5M3 17l9 5 9-5" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconTeams() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 20V10l8-6 8 6v10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

function IconModules() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 4h4a2 2 0 0 1 2 2v2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M14 10h4a2 2 0 0 1 2 2v2h-6v-2a2 2 0 0 1 2-2z" />
      <path d="M4 16h6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z" />
      <path d="M12 8v2M8 14v2M18 14v2" />
    </svg>
  );
}

function IconPlug() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 7v5a4 4 0 0 0 8 0V7" />
      <path d="M9 3v4M15 3v4M12 16v5" />
    </svg>
  );
}

function IconLanguages() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

function IconTodo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 7h11M9 12h11M9 17h11" />
      <path d="M4 7l1.5 1.5L8 6M4 12l1.5 1.5L8 11M4 17l1.5 1.5L8 16" />
    </svg>
  );
}

function IconTranslations() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h9M8.5 6c0 6-3 9-6 10M6 11c1.5 2 3.5 3.5 6 4" />
      <path d="M14 20l4-10 4 10M15.5 17h5" />
    </svg>
  );
}

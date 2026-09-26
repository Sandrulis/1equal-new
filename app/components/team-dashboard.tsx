"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { EVENTS, MEMBERS, TEAM_NAME, type EventType, type Member, type TeamEvent } from "@/app/lib/demo-data";
import { teamPlayer } from "@/app/lib/auth/profile";
import { creatorMember } from "@/app/lib/team-creator";
import { PlayerLinkHint } from "@/app/components/team-switcher";
import { DEMO_INVITE_CODE, findIssuedTeam, forgetTeam, getCurrentTeam, listMyTeams, normalizeInviteCode, replaceMyTeams, selectMyTeam, setCurrentTeam, type IssuedTeam } from "@/app/lib/invite-code";
import { createOwnedTeam, joinOwnedTeam } from "@/app/lib/team-actions";
import {
  formatDisplayDate,
  formatDuration,
  formatMoney,
  formatMonthTitle,
  formatWeekday,
  hoursBetween,
  isoDate,
  parseIsoDate,
  weekdayHeaders,
} from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { EventDetails, type Rsvp } from "@/app/components/event-details";
import { IconChevronLeft, IconChevronRight, IconPlus, IconX } from "@/app/components/icon-tip-button";
import { EventLineup, type SideMap, type SlotMap } from "@/app/components/event-lineup";
import { SiteFooter } from "@/app/components/site-footer";
import { AdminIntegrationsPage } from "@/app/components/admin-integrations-page";
import { AdminModulesPage } from "@/app/components/admin-modules-page";
import { AdminLanguagesForm } from "@/app/components/admin-languages-form";
import { AdminSettingsForm } from "@/app/components/admin-settings-form";
import { AdminSubteamsList } from "@/app/components/admin-subteams-list";
import { AdminTeamsList } from "@/app/components/admin-teams-list";
import { AdminTranslationsManager } from "@/app/components/admin-translations-manager";
import { AdminUsersList } from "@/app/components/admin-users-list";
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
import { useTeamCatalog } from "@/app/lib/team-catalog";

type TypeFilter = "all" | EventType;

type DashboardView = "home" | "team" | "subteams" | "venues";

function eventCost(event: TeamEvent, pricePerHour: number): number {
  return hoursBetween(event.start, event.end) * pricePerHour;
}

function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function EventCardBody({ event, game, cost }: { event: TeamEvent; game: boolean; cost: number }) {
  const { t } = useLanguage();
  const { subteamById } = useTeamCatalog();
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold ${game ? "text-game" : "text-train"}`}>
            {game ? t("legend.game") : t("legend.training")}
          </p>
          <p className="mt-0.5 font-medium">{t(eventTitleKey(event.titleId))}</p>
        </div>
        <p className="text-sm font-semibold tabular-nums">{formatMoney(cost)}</p>
      </div>
      <p className="mt-2 text-sm text-muted">
        {event.start}-{event.end}, {formatDuration(hoursBetween(event.start, event.end))}
      </p>
      <p className="mt-1 text-sm">{subteamById(event.subteamId)?.name}</p>
    </>
  );
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
  const serverTeams = initialTeams.map((team) => `${team.id ?? ""}:${team.leaderId ?? ""}:${team.code}:${(team.members ?? []).map((member) => `${member.id}:${member.updatedAt}:${member.balance}:${(member.ledger ?? []).map((entry) => entry.id).join(".")}:${member.feeExempt ? 1 : 0}:${(member.subteamIds ?? []).join(".")}`).join(",")}:${(team.subteams ?? []).map((item) => `${item.id}:${item.name}:${item.color}`).join(",")}:${(team.venues ?? []).map((item) => `${item.id}:${item.name}:${item.pricePerHour}:${item.hidden ? 1 : 0}`).join(",")}`).join("|");
  const preferredCode = useRef<string | null>(null);
  preferredCode.current = ownedTeam?.code ?? preferredCode.current;
  useEffect(() => {
    if (!account || !initialTeams.length) return;
    replaceMyTeams(initialTeams);
    const preferred = preferredCode.current && initialTeams.some((team) => team.code === preferredCode.current) ? preferredCode.current : initialTeams[0].code;
    const next = selectMyTeam(preferred);
    if (!next) return;
    setOwnedTeam(next);
    setTeams(listMyTeams());
  }, [account, initialTeams, serverTeams]);
  const [profile, setProfile] = useState(account);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const needsTeam = Boolean(account) && !ownedTeam;
  const activeTeam = account ? ownedTeam : { name: TEAM_NAME, code: DEMO_INVITE_CODE, demo: true };
  const pathname = usePathname();
  const router = useRouter();
  const route = routeFromPathname(pathname, basePath);
  const view = route.view;
  const showStart = needsTeam && (view === "home" || view === "team" || view === "subteams" || view === "venues");

  async function createTeam(name: string, sourceUrl: string | null, logoUrl: string | null) {
    if (creating.current) return;
    creating.current = true;
    let result: Awaited<ReturnType<typeof createOwnedTeam>>;
    try {
      result = await createOwnedTeam({ name, sourceUrl, logoUrl });
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminNavOpen, setAdminNavOpen] = useState(false);
  const [compactRail, setCompactRail] = useState(false);
  const overlay = compactRail && !sidebarCollapsed;

  useLayoutEffect(() => {
    const narrowQuery = window.matchMedia("(max-width: 1023px)");
    const railQuery = window.matchMedia("(min-width: 600px) and (max-width: 1023px)");
    function sync() {
      setCompactRail(railQuery.matches);
      setSidebarCollapsed(narrowQuery.matches);
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
    const wide = window.matchMedia("(min-width: 600px)");
    function close() {
      if (wide.matches) setAdminNavOpen(false);
    }
    wide.addEventListener("change", close);
    return () => wide.removeEventListener("change", close);
  }, []);

  useEffect(() => {
    if (!adminNavOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAdminNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [adminNavOpen]);
  const [savedSlots, setSavedSlots] = useState<Record<string, SlotMap>>({});
  const [savedSides, setSavedSides] = useState<Record<string, SideMap>>({});
  const [rsvp, setRsvp] = useState<Record<string, Record<string, Rsvp>>>({});
  const pendingAnchor = useRef<string | null>(null);

  const activeSubteamId = subteamId && filterSubteams.some((item) => item.id === subteamId) ? subteamId : null;
  const activeVenueId = venueId && venues.some((item) => item.id === venueId) ? venueId : null;

  const filtered = useMemo(() => {
    return EVENTS.filter((event) => {
      if (typeFilter !== "all" && event.type !== typeFilter) return false;
      if (activeSubteamId && event.subteamId !== activeSubteamId) return false;
      if (activeVenueId && event.venueId !== activeVenueId) return false;
      return true;
    });
  }, [activeSubteamId, activeVenueId, typeFilter]);

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

  function setMemberRsvp(memberId: string, status: Rsvp) {
    if (!openEventId) return;
    setRsvp((current) => ({
      ...current,
      [openEventId]: { ...current[openEventId], [memberId]: status },
    }));
  }

  function toggleVenue(id: string) {
    setVenueId((current) => (current === id ? null : id));
  }

  function clearFilters() {
    setTypeFilter("all");
    setSubteamId(null);
    setVenueId(null);
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
    const event = EVENTS.find((item) => item.id === openEventId);
    if (!event) return;
    const date = parseIsoDate(event.date);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setSelectedIso(event.date);
    const timer = window.setTimeout(() => {
      document.getElementById("event-details")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openEventId, lineup]);

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
      }
    : {};

  function showAdmin(section: AdminSection) {
    collapseIfNarrow();
    router.push(`${basePath}/admin/${section}`);
    window.scrollTo({ top: 0 });
  }

  const cells = monthCells(year, month);
  const openEvent = openEventId ? EVENTS.find((event) => event.id === openEventId) ?? null : null;
  const lineupEvent = lineup && openEventId ? EVENTS.find((event) => event.id === openEventId) ?? null : null;

  return (
    <div
      className="flex min-h-screen flex-col min-[600px]:grid min-[600px]:grid-cols-[var(--side)_minmax(0,1fr)] min-[600px]:transition-[grid-template-columns] min-[600px]:duration-200"
      style={{ "--side": overlay || sidebarCollapsed ? "4.5rem" : "15rem" } as CSSProperties}
    >
      {account?.isAdmin && adminNavOpen ? (
        <div className="fixed inset-0 z-50 min-[600px]:hidden">
          <button type="button" aria-label={t("event.close")} className="absolute inset-0 bg-ink/40" onClick={() => setAdminNavOpen(false)} />
          <aside className="relative z-10 flex h-full w-60 flex-col bg-navy text-white shadow-xl">
            <div className="flex items-center justify-between gap-2 px-3 py-3">
              <p className="min-w-0 truncate text-sm font-semibold">{t("nav.admin")}</p>
              <button type="button" aria-label={t("event.close")} onClick={() => setAdminNavOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-white/10">
                <IconX />
              </button>
            </div>
            <nav aria-label={t("nav.admin")} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4">
              {ADMIN_NAV.map((item) => (
                <SideItem
                  key={item.section}
                  label={t(item.label)}
                  count={adminCounts[item.section]}
                  icon={item.icon}
                  row
                  active={route.view === "admin" && route.section === item.section}
                  onClick={() => {
                    setAdminNavOpen(false);
                    showAdmin(item.section);
                  }}
                />
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
      {overlay ? (
        <button
          type="button"
          aria-label={t("sidebar.collapse")}
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm"
        />
      ) : null}
      <div className={overlay ? "relative z-40" : "contents"}>
      <aside className={overlay ? "fixed top-0 left-0 z-40 flex h-screen w-60 flex-col bg-navy text-white shadow-xl" : "order-2 bg-navy text-white max-[599px]:fixed max-[599px]:inset-x-0 max-[599px]:bottom-0 max-[599px]:z-40 max-[599px]:flex max-[599px]:h-auto max-[599px]:flex-row max-[599px]:pb-[env(safe-area-inset-bottom)] min-[600px]:sticky min-[600px]:top-0 min-[600px]:z-20 min-[600px]:order-none min-[600px]:flex min-[600px]:h-screen min-[600px]:flex-col"}>
        <div className={`hidden items-center gap-2 py-4 min-[600px]:flex ${sidebarCollapsed ? "min-[600px]:flex-col min-[600px]:px-2" : "pr-4 pl-[18px]"}`}>
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
          {sidebarCollapsed ? null : (
            <span className="flex min-w-0 items-center gap-2">
              {brand.logoUrl ? <img src={brand.logoUrl} alt="" className="h-7 w-auto" /> : null}
              <p className="min-w-0 truncate text-base font-semibold tracking-wide">{brand.name}</p>
            </span>
          )}
        </div>
        <nav
          className={`flex flex-wrap gap-1 px-3 pb-3 max-[599px]:w-full max-[599px]:flex-nowrap max-[599px]:items-stretch max-[599px]:justify-around max-[599px]:gap-0.5 max-[599px]:px-1 max-[599px]:py-1.5 min-[600px]:min-h-0 min-[600px]:flex-1 min-[600px]:flex-col min-[600px]:flex-nowrap min-[600px]:px-2 min-[600px]:pb-4 ${sidebarCollapsed ? "min-[600px]:items-center min-[600px]:overflow-visible" : "min-[600px]:items-stretch min-[600px]:overflow-y-auto"}`}
          aria-label={t("nav.sections")}
        >
          <SideItem label={t("nav.calendar")} icon={<IconCalendar />} active={view === "home"} compact={sidebarCollapsed} onClick={() => showHome("kalendars")} />
          <SideItem label={t("nav.members")} count={rosterCount} icon={<IconUsers />} active={view === "team"} compact={sidebarCollapsed} onClick={() => showView("team")} />
          {moduleOn(FRONTEND_MODULE_KEYS.subteams) ? <SideItem label={t("nav.subteams")} count={subteamCount} icon={<IconLayers />} active={view === "subteams"} compact={sidebarCollapsed} onClick={() => showView("subteams")} /> : null}
          <SideItem label={t("nav.venues")} count={venueCount} icon={<IconPin />} active={view === "venues"} compact={sidebarCollapsed} onClick={() => showView("venues")} />
        </nav>
        {account?.isAdmin ? (
          <nav
            aria-label={t("nav.admin")}
            className={`mt-auto hidden shrink-0 flex-col gap-1 border-t border-white/15 px-2 pt-3 pb-4 min-[600px]:flex ${sidebarCollapsed ? "items-center" : ""}`}
          >
            <p className="sr-only">{t("nav.admin")}</p>
            {ADMIN_NAV.map((item) => (
              <SideItem
                key={item.section}
                label={t(item.label)}
                count={adminCounts[item.section]}
                icon={item.icon}
                compact={sidebarCollapsed}
                active={route.view === "admin" && route.section === item.section}
                onClick={() => showAdmin(item.section)}
              />
            ))}
          </nav>
        ) : null}
      </aside>
      </div>

      <div className="flex min-h-screen min-w-0 flex-col max-[599px]:contents">
      <TopBar
        key={ownedTeam ? teamPlayer(profile, ownedTeam.code)?.sourceUrl ?? ownedTeam.code : "account"}
        account={profile}
        team={activeTeam ? { name: activeTeam.name, code: activeTeam.code, logoUrl: activeTeam.logoUrl } : null}
        teams={account ? teams : []}
        onHome={() => showHome()}
        onSelectTeam={selectTeam}
        onCreateTeam={createTeam}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        onAccountChange={setProfile}
        onOpenAdmin={account?.isAdmin ? () => setAdminNavOpen(true) : undefined}
      />
      <main className="order-3 flex-1 px-4 py-5 sm:px-6 lg:order-none lg:px-8 lg:py-7">
        {account && ownedTeam && !teamPlayer(profile, ownedTeam.code) && route.view !== "admin" && !showStart ? (
          <PlayerLinkHint teamCode={ownedTeam.code} onOpen={() => setSettingsOpen(true)} />
        ) : null}
        {showStart ? <NoTeamStart onCreate={createTeam} onJoin={joinTeam} /> : null}
        {((!moduleVisible && route.view !== "admin") || lineupBlocked) && !showStart ? (
          <p className="rounded-2xl bg-paper px-4 py-8 text-sm text-muted ring-1 ring-line">{t("frontend_modules.disabled")}</p>
        ) : null}
        {view === "home" && lineupEvent && lineupAllowed && !showStart && moduleVisible ? (
          <EventLineup
            key={lineupEvent.id}
            event={lineupEvent}
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
            initialMembers={activeTeam.demo || !profile ? MEMBERS : activeTeam.members?.length ? activeTeam.members : [creatorMember(profile, activeTeam.code)]}
            memberId={route.view === "team" ? route.memberId : null}
            onOpenMember={(id) => router.push(teamHref(basePath, id))}
            onCloseMember={() => router.push(teamHref(basePath))}
            subteams={activeTeam.demo ? undefined : (activeTeam.subteams ?? [])}
            onMemberSaved={rememberMember}
            onMemberRemoved={forgetMember}
            finance={financeAllowed}
          />
        ) : null}
        {view === "subteams" && !showStart && moduleVisible ? (
          <SubteamAdmin
            teamId={activeTeam && !activeTeam.demo ? (activeTeam.id ?? null) : null}
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
              <AdminTeamsList teams={admin.teams} subteams={admin.subteams} members={admin.members} openTeamId={openTeamId} />
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
          </div>
        ) : null}
        <div className={view === "home" && !lineupEvent && !showStart && moduleVisible ? undefined : "hidden"}>
        <section id="kalendars" className="scroll-mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
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
                {weekdayHeaders(formatLang).map((label, index) => (
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
                      } ${lastRow ? "" : "border-b"} ${
                        selected
                          ? isToday
                            ? "bg-[#e7eef4]"
                            : "bg-[#e7eef4] shadow-[inset_0_0_0_2px_#102433]"
                          : inMonth
                            ? "bg-paper hover:bg-ice"
                            : "bg-[#f6f8fa] hover:bg-ice"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(click) => {
                          click.stopPropagation();
                          selectDay(date);
                        }}
                        aria-pressed={selected}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={formatDisplayDate(iso)}
                        className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${
                          isToday ? "bg-train text-white" : inMonth ? "text-ink" : "text-muted"
                        }`}
                      >
                        {date.getDate()}
                      </button>
                      <span className="flex flex-col gap-1">
                        {events.slice(0, 2).map((event) => {
                          const place = venueById(event.venueId)?.area.split(",")[0] ?? "";
                          const label = `${event.start} ${place}`.trim();
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
                              } ${openEventId === event.id ? "ring-1 ring-navy" : ""}`}
                            >
                              <span className="max-[499px]:hidden">{label}</span>
                              <span className="hidden tabular-nums max-[499px]:inline">{event.start}</span>
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

          <div className="flex flex-col gap-3 xl:sticky xl:top-5">
          <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
            <IconPlus />
            {t("event.add")}
          </button>
          <aside className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{formatWeekday(selectedIso, formatLang)}</p>
            <h2 className="mt-1 text-lg font-semibold">{formatDisplayDate(selectedIso)}</h2>
            {selectedEvents.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                {filtersActive ? t("day.emptyFiltered") : t("day.empty")}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {selectedEvents.map((event) => {
                  const venue = venueById(event.venueId);
                  const hours = hoursBetween(event.start, event.end);
                  const cost = eventCost(event, venue?.pricePerHour ?? 0);
                  const game = event.type === "game";
                  return (
                    <li key={event.id} className={`rounded-xl bg-ice p-3 ${lineup && lineupEvent?.id === event.id ? "ring-1 ring-navy" : ""}`}>
                      {lineupAllowed ? (
                        <button type="button" onClick={() => openLineup(event)} className="w-full text-left">
                          <EventCardBody event={event} game={game} cost={cost} />
                        </button>
                      ) : (
                        <div>
                          <EventCardBody event={event} game={game} cost={cost} />
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
                      <p className="mt-1 text-xs text-muted">
                        {formatDuration(hours)} × {formatMoney(venue?.pricePerHour ?? 0)}/h
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
          </div>
        </section>
        {openEvent ? (
          <EventDetails
            event={openEvent}
            rsvp={rsvp[openEvent.id]}
            onRsvp={setMemberRsvp}
            onClose={() => router.push(basePath)}
          />
        ) : null}
        </div>
      </main>
      <div className="order-4 max-[599px]:pb-24">
        <SiteFooter />
      </div>
      </div>
    </div>
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
];

function SideItem({
  label,
  count,
  icon,
  active,
  compact,
  row = false,
  onClick,
}: {
  label: string;
  count?: number;
  icon: ReactNode;
  active?: boolean;
  compact?: boolean;
  row?: boolean;
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
      className={`group relative text-white/90 hover:bg-white/10 ${
        row
          ? "inline-flex w-full flex-none flex-row items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm"
          : `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center text-[11px] leading-tight ${
              compact
                ? "min-[600px]:grid min-[600px]:h-9 min-[600px]:w-9 min-[600px]:flex-none min-[600px]:place-items-center min-[600px]:gap-0 min-[600px]:rounded-lg min-[600px]:px-0 min-[600px]:py-0"
                : "min-[600px]:inline-flex min-[600px]:w-full min-[600px]:flex-none min-[600px]:flex-row min-[600px]:items-center min-[600px]:gap-2 min-[600px]:rounded-xl min-[600px]:px-2.5 min-[600px]:py-1.5 min-[600px]:text-left min-[600px]:text-sm"
            }`
      } ${active ? "bg-white/15" : ""}`}
    >
      <span className={`inline-grid shrink-0 place-items-center [&_svg]:h-[22px] [&_svg]:w-[22px] ${row ? "h-7 w-7 [&_svg]:h-4 [&_svg]:w-4" : `min-[600px]:[&_svg]:h-4 min-[600px]:[&_svg]:w-4 ${compact ? "" : "min-[600px]:h-7 min-[600px]:w-7"}`}`}>{icon}</span>
      <span className={row ? "min-w-0 flex-1 truncate" : compact ? "min-[600px]:sr-only" : "min-[600px]:min-w-0 min-[600px]:flex-1 min-[600px]:truncate"}>{label}</span>
      {count != null && !compact ? <span className={`shrink-0 text-xs tabular-nums text-white/55 ${row ? "" : "hidden min-[600px]:inline"}`}>{count}</span> : null}
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

function IconTranslations() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h9M8.5 6c0 6-3 9-6 10M6 11c1.5 2 3.5 3.5 6 4" />
      <path d="M14 20l4-10 4 10M15.5 17h5" />
    </svg>
  );
}

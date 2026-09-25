"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { EVENTS, type EventType, type TeamEvent } from "@/app/lib/demo-data";
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
import { IconChevronLeft, IconChevronRight, IconPlus } from "@/app/components/icon-tip-button";
import { EventLineup, type SideMap, type SlotMap } from "@/app/components/event-lineup";
import { TopBar } from "@/app/components/top-bar";
import { SubteamAdmin } from "@/app/components/subteam-admin";
import { TeamRoster } from "@/app/components/team-roster";
import { VenueAdmin } from "@/app/components/venue-admin";
import { eventHref, routeFromPathname, teamHref, type DashboardBase } from "@/app/lib/dashboard-path";
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

function eventTitleKey(titleId: string): MessageKey {
  return `event.${titleId}` as MessageKey;
}

export function TeamDashboard({ basePath }: { basePath: DashboardBase }) {
  const { lang, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const route = routeFromPathname(pathname, basePath);
  const view = route.view;
  const openEventId = route.view === "home" ? route.eventId : null;
  const lineup = route.view === "home" && route.lineup;
  const { subteams, venues, subteamById, venueById } = useTeamCatalog();
  const todayIso = isoDate(new Date());
  const today = parseIsoDate(todayIso);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [subteamId, setSubteamId] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [savedSlots, setSavedSlots] = useState<Record<string, SlotMap>>({});
  const [savedSides, setSavedSides] = useState<Record<string, SideMap>>({});
  const [rsvp, setRsvp] = useState<Record<string, Record<string, Rsvp>>>({});
  const pendingAnchor = useRef<string | null>(null);

  const activeSubteamId = subteamId && subteams.some((item) => item.id === subteamId) ? subteamId : null;
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

  const cells = monthCells(year, month);
  const openEvent = openEventId ? EVENTS.find((event) => event.id === openEventId) ?? null : null;
  const lineupEvent = lineup && openEventId ? EVENTS.find((event) => event.id === openEventId) ?? null : null;

  return (
    <div
      className="flex min-h-screen flex-col min-[600px]:grid min-[600px]:grid-cols-[var(--side)_minmax(0,1fr)] min-[600px]:transition-[grid-template-columns] min-[600px]:duration-200"
      style={{ "--side": overlay || sidebarCollapsed ? "4.5rem" : "15rem" } as CSSProperties}
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
          {sidebarCollapsed ? null : <p className="min-w-0 truncate text-base font-semibold tracking-wide">1equal</p>}
        </div>
        <nav
          className={`flex flex-wrap gap-1 px-3 pb-3 max-[599px]:w-full max-[599px]:flex-nowrap max-[599px]:items-stretch max-[599px]:justify-around max-[599px]:gap-0.5 max-[599px]:px-1 max-[599px]:py-1.5 min-[600px]:flex-col min-[600px]:flex-nowrap min-[600px]:pb-4 ${sidebarCollapsed ? "min-[600px]:items-center min-[600px]:px-2" : "min-[600px]:items-stretch min-[600px]:px-0"}`}
          aria-label={t("nav.sections")}
        >
          <SideItem label={t("nav.calendar")} icon={<IconCalendar />} active={view === "home"} compact={sidebarCollapsed} onClick={() => showHome("kalendars")} />
          <SideItem label={t("nav.members")} icon={<IconUsers />} active={view === "team"} compact={sidebarCollapsed} onClick={() => showView("team")} />
          <SideItem label={t("nav.subteams")} icon={<IconLayers />} active={view === "subteams"} compact={sidebarCollapsed} onClick={() => showView("subteams")} />
          <SideItem label={t("nav.venues")} icon={<IconPin />} active={view === "venues"} compact={sidebarCollapsed} onClick={() => showView("venues")} />
        </nav>
      </aside>
      </div>

      <div className="min-w-0 max-[599px]:contents">
      <TopBar onHome={() => showHome()} />
      <main className="order-3 px-4 py-5 max-[599px]:pb-24 sm:px-6 lg:order-none lg:px-8 lg:py-7">
        {view === "home" && lineupEvent ? (
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
        {view === "team" ? (
          <TeamRoster
            memberId={route.view === "team" ? route.memberId : null}
            onOpenMember={(id) => router.push(teamHref(basePath, id))}
            onCloseMember={() => router.push(teamHref(basePath))}
          />
        ) : null}
        {view === "subteams" ? <SubteamAdmin /> : null}
        {view === "venues" ? <VenueAdmin /> : null}
        <div className={view === "home" && !lineupEvent ? undefined : "hidden"}>
        <section id="kalendars" className="scroll-mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IconButton label={t("month.prev")} onClick={() => shiftMonth(-1)}>
                  <Chevron direction="left" />
                </IconButton>
                <h2 className="min-w-40 text-center text-lg font-semibold">{formatMonthTitle(year, month, lang)}</h2>
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
              <div className="flex flex-wrap items-center gap-2 max-[499px]:w-full max-[499px]:flex-nowrap max-[499px]:gap-1.5">
                <TypeSwitch value={typeFilter} onChange={setTypeFilter} />
                <label className="sr-only" htmlFor="subteam-filter">
                  {t("filter.subteam")}
                </label>
                <select
                  id="subteam-filter"
                  value={subteamId ?? ""}
                  onChange={(event) => setSubteamId(event.target.value || null)}
                  className="w-fit max-w-full rounded-lg bg-ice px-3 py-2 text-sm text-ink ring-1 ring-line max-[499px]:px-2 max-[499px]:py-1 max-[499px]:text-xs"
                >
                  <option value="">{t("filter.allSubteams")}</option>
                  {subteams.map((subteam) => (
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
                  <FilterChip label={subteamById(activeSubteamId)?.name ?? ""} onClear={() => setSubteamId(null)} />
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
                {weekdayHeaders(lang).map((label, index) => (
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
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{formatWeekday(selectedIso, lang)}</p>
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
                      <button type="button" onClick={() => openLineup(event)} className="w-full text-left">
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
                        {event.start}-{event.end}, {formatDuration(hours)}
                      </p>
                      <p className="mt-1 text-sm">{subteamById(event.subteamId)?.name}</p>
                      </button>
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
      </div>
    </div>
  );
}

function SideItem({
  label,
  icon,
  active,
  compact,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`group relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center text-[11px] leading-tight text-white/90 hover:bg-white/10 ${
        compact
          ? "min-[600px]:grid min-[600px]:h-9 min-[600px]:w-9 min-[600px]:flex-none min-[600px]:place-items-center min-[600px]:gap-0 min-[600px]:rounded-lg min-[600px]:px-0 min-[600px]:py-0"
          : "min-[600px]:inline-flex min-[600px]:w-full min-[600px]:flex-none min-[600px]:flex-row min-[600px]:items-center min-[600px]:gap-1 min-[600px]:rounded-xl min-[600px]:py-1 min-[600px]:pr-3 min-[600px]:pl-[18px] min-[600px]:text-left min-[600px]:text-base"
      } ${active ? "bg-white/15" : ""}`}
    >
      <span className={`inline-grid shrink-0 place-items-center [&_svg]:h-[22px] [&_svg]:w-[22px] min-[600px]:[&_svg]:h-5 min-[600px]:[&_svg]:w-5 ${compact ? "" : "min-[600px]:h-9 min-[600px]:w-9"}`}>{icon}</span>
      <span className={compact ? "min-[600px]:sr-only" : undefined}>{label}</span>
      {compact ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute top-1/2 left-full z-40 ml-2 hidden -translate-y-1/2 rounded-md bg-paper px-2 py-1 text-xs font-medium whitespace-nowrap text-ink ring-1 ring-line min-[600px]:group-hover:block min-[600px]:group-focus-visible:block"
        >
          {label}
        </span>
      ) : null}
    </button>
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

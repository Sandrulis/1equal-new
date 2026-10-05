import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountProfile } from "@/app/lib/auth/session";
import type { BalanceEntry, Member, TeamEvent, Venue } from "@/app/lib/demo-data";
import { rigaDayEndExclusiveIso, rigaDayStartIso, rigaStamp } from "@/app/lib/balance-range";
import { BALANCE_ENTRY_SELECT, mapBalanceEntry, type BalanceEntryRow } from "@/app/lib/balance-entry";
import { historySince, RSVP_SPLIT_CELLS, rsvpHotSince } from "@/app/lib/history-window";
import { readStoredEhlPlayer } from "@/app/lib/ehl-player";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import type { IssuedTeam, TeamLedgerLine, TrainingGuest } from "@/app/lib/invite-code";
import type { Subteam } from "@/app/lib/demo-data";
import { displayPosition, parseExtraPositions } from "@/app/lib/positions";
import { roleFromPosition } from "@/app/lib/team-creator";
import { listUserOrigins } from "@/app/lib/admin-origin";
import { createAdminClient } from "@/app/lib/supabase/admin";

type UserName = { email: string; name: string; first_name: string; last_name: string; avatar_url?: string | null };

export const TEAM_MEMBER_COLUMNS =
  "team_id, user_id, jersey_number, position, extra_positions, phone, ehl_player, fee_exempt, is_team_admin, joined_on, updated_at";

export const TEAM_MEMBER_USER_COLUMNS = `${TEAM_MEMBER_COLUMNS}, users(email, name, first_name, last_name, avatar_url)`;

type MemberRow = {
  team_id: string;
  user_id: string;
  jersey_number: number | null;
  position: string;
  extra_positions?: string;
  phone: string;
  ehl_player: unknown;
  fee_exempt: boolean;
  is_team_admin?: boolean;
  joined_on: string;
  updated_at: string;
  users: UserName | UserName[] | null;
};

type TeamRow = {
  id: string;
  name: string;
  invite_code: string | null;
  source_url: string | null;
  logo_url: string | null;
  leader_id: string | null;
  training_voting_hours: number | null;
  game_voting_hours: number | null;
  currency: string | null;
  sport_id: string | null;
  balance: number | string | null;
  updated_at: string;
};

type EventRow = {
  id: string;
  team_id: string;
  event_date: string;
  start_time: string;
  event_type: string;
  venue_id: string;
  subteam_id: string | null;
  expense: number | string | null;
  with_coach: boolean;
  allow_guests?: boolean;
  settled_at?: string | null;
  lineup?: unknown;
};

export const TEAM_EVENT_COLUMNS = "id, team_id, event_date, start_time, event_type, venue_id, subteam_id, expense, with_coach, allow_guests, settled_at";

export function eventFromRow(row: EventRow): TeamEvent {
  const includesLineup = Object.prototype.hasOwnProperty.call(row, "lineup");
  return {
    id: row.id,
    date: row.event_date.slice(0, 10),
    start: row.start_time.slice(0, 5),
    end: "",
    type: row.event_type === "game" ? "game" : "training",
    titleId: "",
    subteamId: row.subteam_id ?? "",
    venueId: row.venue_id,
    expense: row.expense == null ? null : Number(row.expense),
    withCoach: row.with_coach === true,
    allowGuests: row.allow_guests === true,
    settled: Boolean(row.settled_at),
    ...(includesLineup ? { ...lineupFromJson(row.lineup), lineupLoaded: true } : { lineupLoaded: false }),
  };
}

function lineupFromJson(value: unknown): Pick<TeamEvent, "lineupSlots" | "lineupSides"> {
  if (!value || typeof value !== "object") return {};
  const raw = value as { slots?: unknown; sides?: unknown };
  const lineupSlots: Record<number, string> = {};
  if (raw.slots && typeof raw.slots === "object") {
    for (const [key, memberId] of Object.entries(raw.slots)) {
      const slot = Number(key);
      if (Number.isInteger(slot) && slot >= 1 && slot <= 16 && typeof memberId === "string") lineupSlots[slot] = memberId;
    }
  }
  const lineupSides: Record<string, "black" | "white"> = {};
  if (raw.sides && typeof raw.sides === "object") {
    for (const [memberId, side] of Object.entries(raw.sides)) {
      if (side === "black" || side === "white") lineupSides[memberId] = side;
    }
  }
  return {
    ...(Object.keys(lineupSlots).length ? { lineupSlots } : {}),
    ...(Object.keys(lineupSides).length ? { lineupSides } : {}),
  };
}

type EntryRow = BalanceEntryRow & {
  team_id: string;
  user_id: string;
};

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function personName(user: UserName | null, fallback: string): string {
  if (!user) return fallback;
  const parts = [user.first_name, user.last_name].map((part) => part.trim()).filter(Boolean);
  return parts.join(" ") || user.name.trim() || user.email || fallback;
}

function accountName(user: UserName | null): string {
  if (!user) return "";
  const parts = [user.first_name, user.last_name].map((part) => part.trim()).filter(Boolean);
  return parts.join(" ") || user.name.trim();
}

export function memberFromRow(row: MemberRow, subteamIds: string[] = []): Member {
  const user = one(row.users);
  const ehl = readStoredEhlPlayer(row.ehl_player);
  const position = displayPosition(row.position) || displayPosition(ehl?.position);
  return {
    id: row.user_id,
    name: accountName(user) || ehl?.name || personName(user, ""),
    firstName: user?.first_name?.trim() ?? "",
    lastName: user?.last_name?.trim() ?? "",
    email: user?.email ?? "",
    phone: row.phone ?? "",
    number: row.jersey_number,
    position,
    extraPositions: parseExtraPositions(row.extra_positions, position),
    role: roleFromPosition(position),
    subteamId: subteamIds[0] ?? "",
    subteamIds,
    feeExempt: row.fee_exempt === true,
    teamAdmin: row.is_team_admin === true,
    balance: 0,
    ledger: [],
    ledgerLoaded: false,
    joined: row.joined_on,
    updatedAt: toLocalDateTimeStamp(row.updated_at),
    photoUrl: ehl?.photoUrl ?? user?.avatar_url ?? null,
    avatarUrl: user?.avatar_url ?? null,
    ehl,
  };
}

export async function settleFinishedEvents(teamIds: string[]): Promise<void> {
  const admin = createAdminClient();
  if (!admin || teamIds.length === 0) return;
  await admin.rpc("settle_finished_events", { team_ids: teamIds });
}

function pickDetailTeamId(rows: { id: string }[], activeTeamId: string | null | undefined, watchOnly: Set<string>): string | null {
  if (activeTeamId && rows.some((row) => row.id === activeTeamId)) return activeTeamId;
  return rows.find((row) => !watchOnly.has(row.id))?.id ?? rows[0]?.id ?? null;
}

async function listTrainingGuests(admin: NonNullable<ReturnType<typeof createAdminClient>>, teamId: string): Promise<TrainingGuest[]> {
  const rows = await admin.from("team_event_rsvps").select("event_id, user_id").eq("team_id", teamId).eq("is_guest", true).eq("status", "going").limit(1000);
  if (rows.error || !rows.data?.length) return [];
  const eventIds = [...new Set(rows.data.map((row) => row.event_id as string))];
  const userIds = [...new Set(rows.data.map((row) => row.user_id as string))];
  const [events, people, notes] = await Promise.all([
    admin.from("team_events").select("id, event_date, start_time, venue_id").in("id", eventIds),
    admin.from("users").select("id, name, first_name, last_name, email, phone").in("id", userIds),
    admin.from("team_guest_notes").select("user_id, note").eq("team_id", teamId).in("user_id", userIds),
  ]);
  const eventById = new Map((events.data ?? []).map((row) => [row.id as string, row]));
  const venueIds = [...new Set((events.data ?? []).map((row) => row.venue_id as string).filter(Boolean))];
  const venues = venueIds.length ? await admin.from("venues").select("id, name").in("id", venueIds) : { data: [] };
  const venueById = new Map((venues.data ?? []).map((row) => [row.id as string, String(row.name ?? "").trim()]));
  const personById = new Map((people.data ?? []).map((row) => [row.id as string, { name: displayName(row), email: String(row.email ?? "").trim(), phone: String(row.phone ?? "").trim() }]));
  const noteById = new Map((notes.data ?? []).map((row) => [row.user_id as string, String(row.note ?? "").trim()]));
  return rows.data
    .map((row) => {
      const event = eventById.get(row.event_id as string);
      if (!event) return null;
      const person = personById.get(row.user_id as string);
      return {
        eventId: row.event_id as string,
        userId: row.user_id as string,
        name: person?.name ?? "",
        email: person?.email ?? "",
        phone: person?.phone ?? "",
        note: noteById.get(row.user_id as string) ?? "",
        date: String(event.event_date).slice(0, 10),
        start: String(event.start_time).slice(0, 5),
        venue: venueById.get(event.venue_id as string) ?? "",
      };
    })
    .filter((row): row is TrainingGuest => row !== null)
    .sort((left, right) => `${right.date} ${right.start}`.localeCompare(`${left.date} ${left.start}`));
}

function displayName(row: { name?: string | null; first_name?: string | null; last_name?: string | null }): string {
  const parts = [row.first_name, row.last_name].map((part) => (part ?? "").trim()).filter(Boolean);
  if (parts.length) return parts.join(" ");
  return (row.name ?? "").trim();
}

export async function listOwnedTeams(userId: string, activeTeamId?: string | null): Promise<IssuedTeam[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const [mine, userRow] = await Promise.all([
    admin.from("team_members").select("team_id").eq("user_id", userId),
    admin.from("users").select("is_admin").eq("id", userId).maybeSingle(),
  ]);
  if (mine.error) return [];
  const memberIds = [...new Set((mine.data ?? []).map((row) => row.team_id as string))];
  let watchIds: string[] = [];
  if (userRow.data?.is_admin === true) {
    const watches = await admin.from("admin_team_watches").select("team_id").eq("user_id", userId);
    if (!watches.error) watchIds = [...new Set((watches.data ?? []).map((row) => row.team_id as string))];
  }
  const teamIds = [...new Set([...memberIds, ...watchIds])];
  if (teamIds.length === 0) return [];
  const memberIdSet = new Set(memberIds);
  const watchOnly = new Set(watchIds.filter((id) => !memberIdSet.has(id)));
  const today = rigaStamp().slice(0, 10);
  const since = historySince();
  const hinted = activeTeamId && teamIds.includes(activeTeamId) ? activeTeamId : null;
  const loadDetail = (id: string) => Promise.all([
    admin.from("cron_jobs").select("enabled").eq("job_key", "finance").maybeSingle(),
    admin.from("team_members").select(TEAM_MEMBER_USER_COLUMNS).eq("team_id", id),
    admin.from("subteams").select("id, team_id, name, color, updated_at").eq("team_id", id),
    admin.from("team_member_subteams").select("team_id, user_id, subteam_id").eq("team_id", id),
    admin.rpc("member_balance_totals", { team_ids: [id] }),
    admin.from("venues").select("id, team_id, name, price_per_hour, hidden, updated_at").eq("team_id", id),
    admin.from("team_events").select(TEAM_EVENT_COLUMNS).eq("team_id", id).gte("event_date", since).order("event_date").order("start_time"),
    admin.from("finance_reservations").select("team_id, event_id, user_id, amount, team_events!inner(event_date, start_time)").eq("team_id", id).gte("team_events.event_date", today),
    admin.from("team_modules").select("team_id, module_key").eq("team_id", id),
  ]);
  const [teamRows, prefetched] = await Promise.all([
    admin.from("teams").select("id, name, invite_code, source_url, logo_url, leader_id, training_voting_hours, game_voting_hours, currency, sport_id, balance, updated_at").in("id", teamIds).order("updated_at", { ascending: false }),
    hinted ? loadDetail(hinted) : Promise.resolve(null),
  ]);
  if (teamRows.error || !teamRows.data?.length) return [];
  const detailId = hinted && teamRows.data.some((row) => row.id === hinted) ? hinted : pickDetailTeamId(teamRows.data, null, watchOnly);
  if (!detailId) return [];
  const [cron, members, groups, links, totals, places, events, holds, moduleLinks] = prefetched && detailId === hinted ? prefetched : await loadDetail(detailId);
  const financeReserve = cron.data?.enabled === true;
  const nowStamp = rigaStamp();
  const activeHolds = ((holds.data ?? []) as { team_id: string; event_id: string; user_id: string; amount: number | string; team_events: { event_date: string; start_time: string } | { event_date: string; start_time: string }[] | null }[]).filter((row) => {
    const event = one(row.team_events);
    if (!event) return false;
    return `${String(event.event_date).slice(0, 10)} ${String(event.start_time).slice(0, 5)}` > nowStamp;
  });
  if (members.error || !members.data) return [];
  const splitRsvps = members.data.length * (events.data ?? []).length > RSVP_SPLIT_CELLS;
  const rsvpSince = splitRsvps ? rsvpHotSince() : since;
  const rsvps = await admin.from("team_event_rsvps").select("team_id, event_id, user_id, status, is_guest, team_events!inner(event_date)").eq("team_id", detailId).gte("team_events.event_date", rsvpSince);
  const guests = await listTrainingGuests(admin, detailId);
  const idsByMember = new Map<string, string[]>();
  for (const link of (links.data ?? []) as { team_id: string; user_id: string; subteam_id: string }[]) {
    const key = `${link.team_id}:${link.user_id}`;
    const list = idsByMember.get(key) ?? [];
    list.push(link.subteam_id);
    idsByMember.set(key, list);
  }
  const balanceByMember = new Map<string, number>();
  if (totals.error) {
    const amounts = await admin.from("balance_entries").select("team_id, user_id, amount").eq("team_id", detailId);
    for (const row of (amounts.data ?? []) as { team_id: string; user_id: string; amount: number | string }[]) {
      const key = `${row.team_id}:${row.user_id}`;
      balanceByMember.set(key, Math.round(((balanceByMember.get(key) ?? 0) + Number(row.amount)) * 100) / 100);
    }
  } else {
    for (const row of (totals.data ?? []) as { team_id: string; user_id: string; total: number | string }[]) {
      balanceByMember.set(`${row.team_id}:${row.user_id}`, Number(row.total));
    }
  }
  const byTeam = new Map<string, Member[]>();
  for (const row of members.data as MemberRow[]) {
    const list = byTeam.get(row.team_id) ?? [];
    const key = `${row.team_id}:${row.user_id}`;
    const member = memberFromRow(row, idsByMember.get(key) ?? []);
    member.balance = balanceByMember.get(key) ?? 0;
    list.push(member);
    byTeam.set(row.team_id, list);
  }
  if (userRow.data?.is_admin === true) {
    const origins = await listUserOrigins((members.data as MemberRow[]).map((row) => row.user_id));
    for (const list of byTeam.values()) {
      for (const member of list) {
        const origin = origins.get(member.id);
        member.originIp = origin?.ip ?? "";
        member.originCountry = origin?.countryCode ?? "";
      }
    }
  }
  const subteamsByTeam = new Map<string, Subteam[]>();
  for (const row of (groups.data ?? []) as { id: string; team_id: string; name: string; color: string; updated_at: string }[]) {
    const list = subteamsByTeam.get(row.team_id) ?? [];
    list.push({ id: row.id, name: row.name, color: row.color, updatedAt: toLocalDateTimeStamp(row.updated_at) });
    subteamsByTeam.set(row.team_id, list);
  }
  const venuesByTeam = new Map<string, Venue[]>();
  for (const row of (places.data ?? []) as { id: string; team_id: string; name: string; price_per_hour: number | string; hidden: boolean; updated_at: string }[]) {
    const list = venuesByTeam.get(row.team_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      area: "",
      pricePerHour: Number(row.price_per_hour),
      hidden: row.hidden === true,
      updatedAt: toLocalDateTimeStamp(row.updated_at),
    });
    venuesByTeam.set(row.team_id, list);
  }
  const eventsByTeam = new Map<string, TeamEvent[]>();
  for (const row of (events.data ?? []) as EventRow[]) {
    const list = eventsByTeam.get(row.team_id) ?? [];
    list.push(eventFromRow(row));
    eventsByTeam.set(row.team_id, list);
  }
  const moduleKeysByTeam = new Map<string, string[]>();
  if (!moduleLinks.error) {
    for (const row of (moduleLinks.data ?? []) as { team_id: string; module_key: string }[]) {
      const list = moduleKeysByTeam.get(row.team_id) ?? [];
      list.push(row.module_key);
      moduleKeysByTeam.set(row.team_id, list);
    }
  }
  return (teamRows.data as TeamRow[])
    .filter((team) => team.invite_code)
    .map((team) => {
      const detail = team.id === detailId;
      return {
        id: team.id,
        name: team.name,
        code: team.invite_code as string,
        demo: false,
        sourceUrl: team.source_url,
        logoUrl: team.logo_url,
        leaderId: team.leader_id,
        trainingVotingHours: team.training_voting_hours ?? 24,
        gameVotingHours: team.game_voting_hours ?? 72,
        currency: team.currency,
        sportId: team.sport_id,
        balance: Number(team.balance ?? 0),
        watching: watchOnly.has(team.id),
        financeReserve,
        loaded: detail,
        ...(detail && splitRsvps ? { rsvpSince } : {}),
        ...(detail
          ? {
              moduleKeys: moduleKeysByTeam.get(team.id) ?? [],
              guests,
              rsvps: ((rsvps.data ?? []) as { team_id: string; event_id: string; user_id: string; status: string; is_guest?: boolean }[])
                .filter((row) => row.is_guest !== true && (row.status === "going" || row.status === "absent"))
                .map((row) => ({ eventId: row.event_id, userId: row.user_id, status: row.status as "going" | "absent" })),
              members: byTeam.get(team.id) ?? [],
              subteams: subteamsByTeam.get(team.id) ?? [],
              venues: venuesByTeam.get(team.id) ?? [],
              events: eventsByTeam.get(team.id) ?? [],
              reservations: activeHolds.map((row) => ({ eventId: row.event_id, userId: row.user_id, amount: Number(row.amount) })),
            }
          : {}),
      };
    })
    .sort((left, right) => Number(Boolean(left.watching)) - Number(Boolean(right.watching)))
    .map((team) => {
      if (!team.members) return team;
      const privileged = userRow.data?.is_admin === true || team.leaderId === userId || team.members.some((member) => member.id === userId && member.teamAdmin);
      if (privileged) return team;
      return {
        ...team,
        members: team.members.map((member) => (member.id === userId ? member : { ...member, email: "", phone: "", originIp: "", originCountry: "" })),
        guests: (team.guests ?? []).map((guest) => ({ ...guest, email: "", phone: "" })),
      };
    });
}

export async function listEventLineup(teamId: string, eventId: string): Promise<Pick<TeamEvent, "lineupSlots" | "lineupSides"> | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const row = await admin.from("team_events").select("lineup").eq("team_id", teamId).eq("id", eventId).maybeSingle();
  if (row.error || !row.data) return null;
  return lineupFromJson(row.data.lineup);
}

export async function canReadTeam(userId: string, teamId: string, isAdmin: boolean): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const member = await admin.from("team_members").select("user_id").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  if (member.data) return true;
  if (!isAdmin) return false;
  const watch = await admin.from("admin_team_watches").select("team_id").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  return Boolean(watch.data);
}

export async function readMemberBalance(client: SupabaseClient, teamId: string, userId: string): Promise<number | null> {
  const totals = await client.rpc("member_balance_totals", { team_ids: [teamId] });
  if (totals.error || !totals.data) return null;
  const row = (totals.data as { user_id: string; total: number | string }[]).find((item) => item.user_id === userId);
  return Math.round(Number(row?.total ?? 0) * 100) / 100;
}

export async function listMemberLedger(teamId: string, userId: string, from: string, to: string): Promise<BalanceEntry[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const rows = await admin
    .from("balance_entries")
    .select(BALANCE_ENTRY_SELECT)
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .gte("created_at", rigaDayStartIso(from))
    .lt("created_at", rigaDayEndExclusiveIso(to))
    .order("created_at", { ascending: false })
    .limit(500);
  return ((rows.data ?? []) as EntryRow[]).map((row) => mapBalanceEntry(row));
}

export async function listTeamLedger(teamId: string, from: string, to: string): Promise<TeamLedgerLine[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const rows = await admin
    .from("team_ledger")
    .select("id, event_id, amount, event_date, event_type, created_at, team_events(venues(name))")
    .eq("team_id", teamId)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date", { ascending: false })
    .limit(500);
  return ((rows.data ?? []) as TeamLedgerRow[]).map((row) => {
    const event = one(row.team_events);
    const venue = one(event?.venues);
    return {
      id: row.id,
      amount: Number(row.amount),
      at: toLocalDateTimeStamp(row.created_at),
      eventId: row.event_id,
      eventDate: String(row.event_date).slice(0, 10),
      eventType: row.event_type === "game" ? "game" : "training",
      venueName: venue?.name?.trim() || null,
    };
  });
}

type TeamLedgerRow = {
  id: string;
  event_id: string | null;
  amount: number | string;
  event_date: string;
  event_type: string;
  created_at: string;
  team_events: { venues?: { name?: string | null } | { name?: string | null }[] | null } | { venues?: { name?: string | null } | { name?: string | null }[] | null }[] | null;
};

export async function listTeamHistory(teamId: string, from: string, to: string): Promise<{ events: TeamEvent[]; rsvps: { eventId: string; userId: string; status: "going" | "absent" }[] }> {
  const admin = createAdminClient();
  if (!admin) return { events: [], rsvps: [] };
  const [events, rsvps] = await Promise.all([
    admin.from("team_events").select(TEAM_EVENT_COLUMNS).eq("team_id", teamId).gte("event_date", from).lte("event_date", to).order("event_date").order("start_time"),
    admin.from("team_event_rsvps").select("event_id, user_id, status, is_guest, team_events!inner(event_date)").eq("team_id", teamId).gte("team_events.event_date", from).lte("team_events.event_date", to),
  ]);
  return {
    events: ((events.data ?? []) as EventRow[]).map((row) => eventFromRow(row)),
    rsvps: ((rsvps.data ?? []) as { event_id: string; user_id: string; status: string; is_guest?: boolean }[])
      .filter((row) => row.is_guest !== true && (row.status === "going" || row.status === "absent"))
      .map((row) => ({ eventId: row.event_id, userId: row.user_id, status: row.status as "going" | "absent" })),
  };
}

export async function requireUserAdmin() {
  const account = await getAccountProfile();
  const client = account ? createAdminClient() : null;
  if (!account || !client) return null;
  return { account, client };
}

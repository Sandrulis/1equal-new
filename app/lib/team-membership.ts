import { getAccountProfile } from "@/app/lib/auth/session";
import type { BalanceEntry, Member, TeamEvent, Venue } from "@/app/lib/demo-data";
import { readStoredEhlPlayer } from "@/app/lib/ehl-player";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import type { IssuedTeam, TeamLedgerLine } from "@/app/lib/invite-code";
import type { Subteam } from "@/app/lib/demo-data";
import { displayPosition, parseExtraPositions } from "@/app/lib/positions";
import { roleFromPosition } from "@/app/lib/team-creator";
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
};

export function eventFromRow(row: EventRow): TeamEvent {
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
  };
}

type EntryRow = {
  id: string;
  team_id: string;
  user_id: string;
  amount: number | string;
  created_at: string;
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
    joined: row.joined_on,
    updatedAt: toLocalDateTimeStamp(row.updated_at),
    photoUrl: ehl?.photoUrl ?? user?.avatar_url ?? null,
    ehl,
  };
}

function historySince(): string {
  const since = new Date();
  since.setDate(since.getDate() - 400);
  return since.toISOString().slice(0, 10);
}

export async function settleFinishedEvents(teamIds: string[]): Promise<void> {
  const admin = createAdminClient();
  if (!admin || teamIds.length === 0) return;
  await admin.rpc("settle_finished_events", { team_ids: teamIds });
}

export async function listOwnedTeams(userId: string): Promise<IssuedTeam[]> {
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
  const cron = await admin.from("cron_jobs").select("enabled").eq("job_key", "finance").maybeSingle();
  const financeReserve = cron.data?.enabled === true;
  if (memberIds.length && !financeReserve) await settleFinishedEvents(memberIds);
  const [teams, members, groups, links, entries, places, events, rsvps, ledgerRows, holds] = await Promise.all([
    admin.from("teams").select("id, name, invite_code, source_url, logo_url, leader_id, training_voting_hours, game_voting_hours, currency, sport_id, balance, updated_at").in("id", teamIds).order("updated_at", { ascending: false }),
    admin
      .from("team_members")
      .select(TEAM_MEMBER_USER_COLUMNS)
      .in("team_id", teamIds),
    admin.from("subteams").select("id, team_id, name, color, updated_at").in("team_id", teamIds),
    admin.from("team_member_subteams").select("team_id, user_id, subteam_id").in("team_id", teamIds),
    admin.from("balance_entries").select("id, team_id, user_id, amount, created_at").in("team_id", teamIds).order("created_at", { ascending: false }),
    admin.from("venues").select("id, team_id, name, price_per_hour, hidden, updated_at").in("team_id", teamIds),
    admin.from("team_events").select("id, team_id, event_date, start_time, event_type, venue_id, subteam_id, expense, with_coach").in("team_id", teamIds).gte("event_date", historySince()).order("event_date").order("start_time"),
    admin.from("team_event_rsvps").select("team_id, event_id, user_id, status").in("team_id", teamIds),
    admin.from("team_ledger").select("id, team_id, event_id, amount, event_date, event_type, created_at").in("team_id", teamIds).gte("event_date", historySince()).order("created_at", { ascending: false }),
    admin.from("finance_reservations").select("team_id, event_id, user_id, amount").in("team_id", teamIds),
  ]);
  if (teams.error || !teams.data || members.error || !members.data) return [];
  const idsByMember = new Map<string, string[]>();
  for (const link of (links.data ?? []) as { team_id: string; user_id: string; subteam_id: string }[]) {
    const key = `${link.team_id}:${link.user_id}`;
    const list = idsByMember.get(key) ?? [];
    list.push(link.subteam_id);
    idsByMember.set(key, list);
  }
  const entriesByMember = new Map<string, BalanceEntry[]>();
  for (const row of (entries.data ?? []) as EntryRow[]) {
    const key = `${row.team_id}:${row.user_id}`;
    const list = entriesByMember.get(key) ?? [];
    list.push({ id: row.id, amount: Number(row.amount), at: toLocalDateTimeStamp(row.created_at) });
    entriesByMember.set(key, list);
  }
  const byTeam = new Map<string, Member[]>();
  for (const row of members.data as MemberRow[]) {
    const list = byTeam.get(row.team_id) ?? [];
    const key = `${row.team_id}:${row.user_id}`;
    const ledger = entriesByMember.get(key) ?? [];
    const member = memberFromRow(row, idsByMember.get(key) ?? []);
    member.ledger = ledger;
    member.balance = Math.round(ledger.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    list.push(member);
    byTeam.set(row.team_id, list);
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
  return (teams.data as TeamRow[])
    .filter((team) => team.invite_code)
    .map((team) => ({
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
      ledger: ((ledgerRows.data ?? []) as { id: string; team_id: string; event_id: string | null; amount: number | string; event_date: string; event_type: string; created_at: string }[])
        .filter((row) => row.team_id === team.id)
        .map((row): TeamLedgerLine => ({
          id: row.id,
          amount: Number(row.amount),
          at: toLocalDateTimeStamp(row.created_at),
          eventId: row.event_id,
          eventDate: String(row.event_date).slice(0, 10),
          eventType: row.event_type === "game" ? "game" : "training",
        })),
      rsvps: ((rsvps.data ?? []) as { team_id: string; event_id: string; user_id: string; status: string }[])
        .filter((row) => row.team_id === team.id && (row.status === "going" || row.status === "absent"))
        .map((row) => ({ eventId: row.event_id, userId: row.user_id, status: row.status as "going" | "absent" })),
      members: byTeam.get(team.id) ?? [],
      subteams: subteamsByTeam.get(team.id) ?? [],
      venues: venuesByTeam.get(team.id) ?? [],
      events: eventsByTeam.get(team.id) ?? [],
      watching: watchOnly.has(team.id),
      financeReserve,
      reservations: ((holds.data ?? []) as { team_id: string; event_id: string; user_id: string; amount: number | string }[])
        .filter((row) => row.team_id === team.id)
        .map((row) => ({ eventId: row.event_id, userId: row.user_id, amount: Number(row.amount) })),
    }))
    .sort((left, right) => Number(Boolean(left.watching)) - Number(Boolean(right.watching)));
}

export async function requireUserAdmin() {
  const account = await getAccountProfile();
  const client = account ? createAdminClient() : null;
  if (!account || !client) return null;
  return { account, client };
}

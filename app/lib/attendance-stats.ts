import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamEvent } from "@/app/lib/demo-data";
import { rigaStamp } from "@/app/lib/balance-range";
import { eventAudienceIncludes } from "@/app/lib/event-voting";

export type AttendanceStats = {
  gamesGoing: number;
  gamesTotal: number;
  trainingsGoing: number;
  trainingsTotal: number;
};

export function emptyAttendance(): AttendanceStats {
  return { gamesGoing: 0, gamesTotal: 0, trainingsGoing: 0, trainingsTotal: 0 };
}

type AudienceMember = {
  id: string;
  joined: string;
  subteamId: string;
  subteamIds?: string[];
  teamId?: string;
};

type EventLite = {
  id: string;
  teamId: string;
  date: string;
  start: string;
  type: "game" | "training";
  subteamId: string;
};

type EventRow = {
  id: string;
  team_id: string;
  event_date: string;
  start_time: string;
  event_type: string;
  subteam_id: string | null;
};

type RsvpRow = {
  event_id: string;
  user_id: string;
};

type MemberRow = {
  team_id: string;
  user_id: string;
  joined_on: string;
};

type LinkRow = {
  team_id: string;
  user_id: string;
  subteam_id: string;
};

const PAGE = 1000;

function eventStarted(event: { date: string; start: string }, now = new Date()): boolean {
  return `${event.date.slice(0, 10)} ${event.start.slice(0, 5)}` <= rigaStamp(now);
}

function addAttendance(left: AttendanceStats, right: AttendanceStats): AttendanceStats {
  return {
    gamesGoing: left.gamesGoing + right.gamesGoing,
    gamesTotal: left.gamesTotal + right.gamesTotal,
    trainingsGoing: left.trainingsGoing + right.trainingsGoing,
    trainingsTotal: left.trainingsTotal + right.trainingsTotal,
  };
}

export function tallyAttendance(members: AudienceMember[], events: EventLite[], goingKeys: Set<string>, now = new Date()): Map<string, AttendanceStats> {
  const finished = events.filter((event) => eventStarted(event, now));
  const byTeam = new Map<string, EventLite[]>();
  for (const event of finished) {
    const list = byTeam.get(event.teamId) ?? [];
    list.push(event);
    byTeam.set(event.teamId, list);
  }
  const stats = new Map<string, AttendanceStats>();
  for (const member of members) {
    const teamEvents = member.teamId ? (byTeam.get(member.teamId) ?? []) : finished;
    const row = emptyAttendance();
    const joined = member.joined.slice(0, 10);
    for (const event of teamEvents) {
      if (joined && event.date < joined) continue;
      if (!eventAudienceIncludes({ subteamId: event.subteamId } as TeamEvent, member)) continue;
      const attended = goingKeys.has(`${event.id}:${member.id}`);
      if (event.type === "game") {
        row.gamesTotal += 1;
        if (attended) row.gamesGoing += 1;
      } else {
        row.trainingsTotal += 1;
        if (attended) row.trainingsGoing += 1;
      }
    }
    const previous = stats.get(member.id);
    stats.set(member.id, previous ? addAttendance(previous, row) : row);
  }
  return stats;
}

async function eachPage<T>(
  load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; from < 20_000; from += PAGE) {
    const { data, error } = await load(from, from + PAGE - 1);
    if (error) return null;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

function eventLite(row: EventRow): EventLite {
  return {
    id: row.id,
    teamId: row.team_id,
    date: String(row.event_date).slice(0, 10),
    start: String(row.start_time).slice(0, 5),
    type: row.event_type === "game" ? "game" : "training",
    subteamId: row.subteam_id ?? "",
  };
}

export async function loadTeamAttendance(
  admin: SupabaseClient,
  teamId: string,
  members: AudienceMember[],
): Promise<Map<string, AttendanceStats> | null> {
  if (members.length === 0) return new Map();
  const today = rigaStamp().slice(0, 10);
  const [events, rsvps] = await Promise.all([
    eachPage<EventRow>((from, to) =>
      admin
        .from("team_events")
        .select("id, team_id, event_date, start_time, event_type, subteam_id")
        .eq("team_id", teamId)
        .lte("event_date", today)
        .order("id")
        .range(from, to),
    ),
    eachPage<RsvpRow>((from, to) =>
      admin
        .from("team_event_rsvps")
        .select("event_id, user_id")
        .eq("team_id", teamId)
        .eq("status", "going")
        .eq("is_guest", false)
        .order("event_id")
        .order("user_id")
        .range(from, to),
    ),
  ]);
  if (!events || !rsvps) return null;
  const going = new Set(rsvps.map((row) => `${row.event_id}:${row.user_id}`));
  return tallyAttendance(
    members.map((member) => ({ ...member, teamId })),
    events.map((row) => eventLite({ ...row, team_id: teamId })),
    going,
  );
}

export async function loadAttendanceByUser(admin: SupabaseClient, teamIds?: Set<string>): Promise<Map<string, AttendanceStats>> {
  if (teamIds && teamIds.size === 0) return new Map();
  const today = rigaStamp().slice(0, 10);
  const ids = teamIds ? [...teamIds] : null;
  const [events, rsvps, members, links] = await Promise.all([
    eachPage<EventRow>((from, to) => {
      const query = admin.from("team_events").select("id, team_id, event_date, start_time, event_type, subteam_id").lte("event_date", today);
      return (ids ? query.in("team_id", ids) : query).order("id").range(from, to);
    }),
    eachPage<RsvpRow>((from, to) => {
      const query = admin
        .from("team_event_rsvps")
        .select("event_id, user_id, team_events!inner(event_date)")
        .eq("status", "going")
        .eq("is_guest", false)
        .lte("team_events.event_date", today);
      return (ids ? query.in("team_id", ids) : query).order("event_id").order("user_id").range(from, to);
    }),
    eachPage<MemberRow>((from, to) => {
      const query = admin.from("team_members").select("team_id, user_id, joined_on");
      return (ids ? query.in("team_id", ids) : query).order("team_id").order("user_id").range(from, to);
    }),
    eachPage<LinkRow>((from, to) => {
      const query = admin.from("team_member_subteams").select("team_id, user_id, subteam_id");
      return (ids ? query.in("team_id", ids) : query).order("team_id").order("user_id").range(from, to);
    }),
  ]);
  if (!events || !rsvps || !members || !links) return new Map();
  const allowedMembers = teamIds ? members.filter((member) => teamIds.has(member.team_id)) : members;
  const allowedEvents = teamIds ? events.filter((event) => teamIds.has(event.team_id)) : events;
  const subteams = new Map<string, string[]>();
  for (const link of links) {
    const key = `${link.team_id}:${link.user_id}`;
    const list = subteams.get(key) ?? [];
    list.push(link.subteam_id);
    subteams.set(key, list);
  }
  const going = new Set(rsvps.map((row) => `${row.event_id}:${row.user_id}`));
  return tallyAttendance(
    allowedMembers.map((member) => {
      const ids = subteams.get(`${member.team_id}:${member.user_id}`) ?? [];
      return {
        id: member.user_id,
        teamId: member.team_id,
        joined: member.joined_on,
        subteamId: ids[0] ?? "",
        subteamIds: ids,
      };
    }),
    allowedEvents.map(eventLite),
    going,
  );
}

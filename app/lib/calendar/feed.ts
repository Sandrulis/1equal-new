import { createHash } from "node:crypto";
import { rigaDate } from "@/app/lib/balance-range";
import { buildIcs, type CalendarFeedEvent } from "@/app/lib/calendar/ical";
import { FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import { listEnabledFrontendModuleKeys, listFrontendModules } from "@/app/lib/site-admin/repository";
import { createAdminClient } from "@/app/lib/supabase/admin";

const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

export function isCalendarToken(value: string) {
  return TOKEN_PATTERN.test(value);
}

export async function calendarFeedIcs(token: string): Promise<string | null> {
  if (!isCalendarToken(token)) return null;
  const modules = await listEnabledFrontendModuleKeys();
  if (!modules.includes(FRONTEND_MODULE_KEYS.calendar)) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  const hash = createHash("sha256").update(token).digest("hex");
  const user = await admin.from("users").select("id").eq("calendar_token_hash", hash).maybeSingle();
  if (!user.data?.id) return null;

  const memberships = await admin.from("team_members").select("team_id").eq("user_id", user.data.id);
  let teamIds = [...new Set((memberships.data ?? []).map((row) => row.team_id as string))];
  if (teamIds.length === 0) return buildIcs([], "1Equal");
  const listed = await listFrontendModules();
  const calendar = listed?.find((item) => item.moduleKey === FRONTEND_MODULE_KEYS.calendar);
  if (calendar?.isIndividual) {
    const links = await admin.from("team_modules").select("team_id").eq("module_key", FRONTEND_MODULE_KEYS.calendar).in("team_id", teamIds);
    const allowed = new Set((links.data ?? []).map((row) => row.team_id as string));
    teamIds = links.error ? [] : teamIds.filter((id) => allowed.has(id));
  }
  if (teamIds.length === 0) return buildIcs([], "1Equal");

  const [teams, events] = await Promise.all([
    admin.from("teams").select("id, name").in("id", teamIds),
    admin.from("team_events").select("id, team_id, event_date, start_time, event_type, venue_id").in("team_id", teamIds).gte("event_date", rigaDate()).order("event_date").order("start_time"),
  ]);
  const teamName = new Map((teams.data ?? []).map((row) => [row.id as string, String(row.name)]));
  const venueIds = [...new Set((events.data ?? []).map((row) => row.venue_id as string).filter(Boolean))];
  const venues = venueIds.length > 0 ? await admin.from("venues").select("id, name").in("id", venueIds) : { data: [] };
  const venueName = new Map((venues.data ?? []).map((row) => [row.id as string, String(row.name)]));

  const feed: CalendarFeedEvent[] = (events.data ?? []).flatMap((row) => {
    const type = row.event_type === "game" || row.event_type === "training" ? row.event_type : null;
    const date = String(row.event_date).slice(0, 10);
    const start = String(row.start_time).slice(0, 5);
    if (!type || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start)) return [];
    return [
      {
        id: String(row.id),
        date,
        start,
        type,
        teamName: teamName.get(row.team_id as string) || "1Equal",
        venueName: venueName.get(row.venue_id as string) || "",
      },
    ];
  });

  const names = [...new Set(feed.map((event) => event.teamName))];
  const calendarName = names.length === 1 ? names[0] : "1Equal";
  return buildIcs(feed, calendarName);
}

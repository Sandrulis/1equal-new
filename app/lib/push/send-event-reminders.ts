import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { Message } from "firebase-admin/messaging";
import { eventHref } from "@/app/lib/dashboard-path";
import { isTimeZone, mergeDisplayPreferences, readUserDisplayPreferences, type SiteDisplaySettings } from "@/app/lib/display-preferences";
import { formatClock, formatDisplayDate } from "@/app/lib/format";
import { translate, type Lang } from "@/app/lib/messages";
import { reminderIsDue, reminderMoment, zonedInstant } from "@/app/lib/push/event-reminder";
import { sendPushBatch } from "@/app/lib/push/send-event-push";
import { getSiteUrl } from "@/app/lib/site";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { createAdminClient } from "@/app/lib/supabase/admin";

const JOB_KEY = "reminders";
const CHANNEL_ID = "events";

function sameToken(stored: string, given: string): boolean {
  if (!given || given.length > 200) return false;
  const left = createHash("sha256").update(stored).digest();
  const right = createHash("sha256").update(given).digest();
  return timingSafeEqual(left, right);
}

function personLang(code: string | null | undefined, fallback: Lang): Lang {
  if (code === "en" || code === "ru" || code === "lv") return code;
  return fallback;
}

function isoDay(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString().slice(0, 10);
}

export async function readReminderCronUrl(): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const row = await admin.from("cron_jobs").select("token").eq("job_key", JOB_KEY).maybeSingle();
  if (row.error || typeof row.data?.token !== "string") return null;
  return `${getSiteUrl()}/api/cron/reminders?token=${encodeURIComponent(row.data.token)}`;
}

export async function reminderCronAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (secret.length >= 16 && sameToken(secret, bearer)) return true;
  const admin = createAdminClient();
  if (!admin) return false;
  const row = await admin.from("cron_jobs").select("token").eq("job_key", JOB_KEY).maybeSingle();
  if (row.error || typeof row.data?.token !== "string") return false;
  return sameToken(row.data.token, request.nextUrl.searchParams.get("token") ?? "");
}

type EventRow = { id: string; team_id: string; event_date: string; start_time: string; event_type: string };
type PersonRow = {
  id: string;
  language_code: string | null;
  timezone: string | null;
  event_reminder: string | null;
  deletion_due_at: string | null;
  week_start_day: string | null;
  date_format: string | null;
  date_separator: string | null;
  time_format: string | null;
};

function personDisplay(person: PersonRow, system: SiteDisplaySettings): SiteDisplaySettings {
  return mergeDisplayPreferences(system, readUserDisplayPreferences(person));
}

async function rowsIn<T>(ids: string[], load: (slice: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[] | null> {
  const rows: T[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const slice = ids.slice(offset, offset + 100);
    const result = await load(slice);
    if (result.error || !result.data) return null;
    rows.push(...result.data);
  }
  return rows;
}

export async function runEventReminders(): Promise<{ ok: true; sent: number } | { ok: false }> {
  const client = createAdminClient();
  if (!client) return { ok: false };
  const events = await client
    .from("team_events")
    .select("id, team_id, event_date, start_time, event_type")
    .gte("event_date", isoDay(-36 * 60 * 60 * 1000))
    .lte("event_date", isoDay(36 * 60 * 60 * 1000));
  if (events.error || !events.data) return { ok: false };
  const upcoming = events.data.filter((row): row is EventRow =>
    typeof row.id === "string" && typeof row.team_id === "string" && typeof row.event_date === "string" && typeof row.start_time === "string",
  );
  if (!upcoming.length) return { ok: true, sent: 0 };

  const eventIds = upcoming.map((row) => row.id);
  const [rsvps, sentRows, brand, language] = await Promise.all([
    rowsIn(eventIds, (slice) => client.from("team_event_rsvps").select("event_id, user_id").in("event_id", slice).eq("status", "going")),
    rowsIn(eventIds, (slice) => client.from("event_reminders_sent").select("event_id, user_id").in("event_id", slice)),
    getSiteBrand(),
    client.from("site_languages").select("code").eq("is_default", true).maybeSingle(),
  ]);
  if (!rsvps || !sentRows) return { ok: false };

  const going = rsvps.filter((row) => typeof row.event_id === "string" && typeof row.user_id === "string");
  if (!going.length) return { ok: true, sent: 0 };
  const already = new Set(sentRows.filter((row) => typeof row.event_id === "string" && typeof row.user_id === "string").map((row) => `${row.event_id}:${row.user_id}`));
  const userIds = [...new Set(going.map((row) => row.user_id))];
  const teamIds = [...new Set(upcoming.map((row) => row.team_id))];
  const [people, devices, teams] = await Promise.all([
    rowsIn<PersonRow>(userIds, (slice) => client.from("users").select("id, language_code, timezone, event_reminder, deletion_due_at, week_start_day, date_format, date_separator, time_format").in("id", slice)),
    rowsIn(userIds, (slice) => client.from("push_devices").select("token, user_id").in("user_id", slice)),
    rowsIn(teamIds, (slice) => client.from("teams").select("id, name").in("id", slice)),
  ]);
  if (!people || !devices || !teams) return { ok: false };

  const personById = new Map(people.filter((row) => typeof row.id === "string").map((row) => [row.id, row]));
  const tokensByUser = new Map<string, string[]>();
  for (const device of devices) {
    if (typeof device.user_id !== "string" || typeof device.token !== "string") continue;
    const list = tokensByUser.get(device.user_id) ?? [];
    list.push(device.token);
    tokensByUser.set(device.user_id, list);
  }
  const teamName = new Map(teams.filter((row) => typeof row.id === "string").map((row) => [row.id, typeof row.name === "string" ? row.name.trim() : ""]));
  const eventById = new Map(upcoming.map((row) => [row.id, row]));
  const eventZone = isTimeZone(brand.display.timeZone) ? brand.display.timeZone : "Europe/Riga";
  const fallback = personLang(language.data?.code, "lv");
  const now = Date.now();
  const due: { eventId: string; userId: string }[] = [];

  for (const vote of going) {
    if (already.has(`${vote.event_id}:${vote.user_id}`)) continue;
    const event = eventById.get(vote.event_id);
    const person = personById.get(vote.user_id);
    const tokens = tokensByUser.get(vote.user_id);
    if (!event || !person || person.deletion_due_at || !tokens?.length) continue;
    const timeZone = personDisplay(person, { ...brand.display, timeZone: eventZone }).timeZone;
    const at = reminderMoment({
      eventDate: event.event_date,
      startTime: event.start_time,
      preference: person.event_reminder ?? "08:00",
      timeZone,
      eventTimeZone: eventZone,
    });
    if (at == null) continue;
    const start = zonedInstant(event.event_date, event.start_time, eventZone);
    if (!reminderIsDue(at, now, start)) continue;
    due.push({ eventId: event.id, userId: person.id });
  }
  if (!due.length) return { ok: true, sent: 0 };

  const claimed: { eventId: string; userId: string }[] = [];
  for (const item of due) {
    const inserted = await client.from("event_reminders_sent").insert({ event_id: item.eventId, user_id: item.userId });
    if (!inserted.error) claimed.push(item);
  }
  if (!claimed.length) return { ok: true, sent: 0 };

  const pending: { token: string; userId: string; eventId: string; message: Message }[] = [];
  for (const item of claimed) {
    const event = eventById.get(item.eventId);
    const person = personById.get(item.userId);
    const tokens = tokensByUser.get(item.userId) ?? [];
    if (!event || !person) continue;
    const lang = personLang(person.language_code, fallback);
    const display = personDisplay(person, { ...brand.display, timeZone: eventZone });
    const typeKey = event.event_type === "game" ? "legend.game" : "legend.training";
    const body = translate(lang, "push.reminder.body", {
      type: translate(lang, typeKey),
      date: formatDisplayDate(event.event_date, display),
      time: formatClock(event.start_time, display.timeFormat),
    });
    const title = teamName.get(event.team_id) || brand.name;
    const path = eventHref("/dashboard", event.id);
    for (const token of tokens) {
      pending.push({
        token,
        userId: item.userId,
        eventId: item.eventId,
        message: {
          token,
          notification: { title, body },
          data: { path },
          android: { priority: "high", notification: { channelId: CHANNEL_ID, sound: "default" } },
        },
      });
    }
  }

  const delivered = await sendPushBatch(pending.map(({ token, message }) => ({ token, message })));
  const reached = new Set(
    delivered ? pending.filter((item) => delivered.has(item.token)).map((item) => `${item.eventId}:${item.userId}`) : [],
  );
  const missed = claimed.filter((item) => !reached.has(`${item.eventId}:${item.userId}`));
  for (const item of missed) {
    await client.from("event_reminders_sent").delete().eq("event_id", item.eventId).eq("user_id", item.userId);
  }
  if (!delivered) return { ok: false };
  const sent = claimed.length - missed.length;
  if (sent > 0) console.info("event reminders sent", sent);
  return { ok: true, sent };
}

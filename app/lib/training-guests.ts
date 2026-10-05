"use server";

import { getAccountProfile } from "@/app/lib/auth/session";
import { refreshTeamData } from "@/app/lib/cache-tags";
import { eventHasEnded } from "@/app/lib/event-voting";
import { FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import { formatClock, formatDisplayDate, formatMoney } from "@/app/lib/format";
import type { MessageKey } from "@/app/lib/messages";
import { moduleEnabledForSport } from "@/app/lib/sport-module";
import { getSiteBrand } from "@/app/lib/site-admin/repository";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireUserAdmin } from "@/app/lib/team-membership";
import { rateLimit } from "@/app/lib/security/rate-limit";

const ID = /^[0-9a-f-]{36}$/i;

type GuestEvent = {
  id: string;
  team_id: string;
  event_date: string;
  start_time: string;
  event_type: string;
  with_coach: boolean;
  allow_guests: boolean;
  venue_id: string;
  expense?: number | string | null;
};

export type GuestSignup = {
  eventId: string;
  teamName: string;
  date: string;
  start: string;
  venue: string;
};

export async function listMyGuestSignups(): Promise<GuestSignup[]> {
  const gate = await requireUserAdmin();
  if (!gate) return [];
  const rows = await gate.client.from("team_event_rsvps").select("event_id").eq("user_id", gate.account.id).eq("is_guest", true).eq("status", "going").limit(100);
  if (rows.error || !rows.data?.length) return [];
  const events = await gate.client.from("team_events").select("id, team_id, event_date, start_time, venue_id").in("id", rows.data.map((row) => row.event_id as string));
  if (events.error || !events.data?.length) return [];
  const open = events.data.filter((row) => !eventHasEnded({ date: String(row.event_date).slice(0, 10), start: String(row.start_time).slice(0, 5) }));
  if (!open.length) return [];
  const teamIds = [...new Set(open.map((row) => row.team_id as string))];
  const teams = await gate.client.from("teams").select("id, name, sport_id").in("id", teamIds);
  const pondByTeam = new Map<string, boolean>();
  await Promise.all((teams.data ?? []).map(async (team) => {
    const enabled = await moduleEnabledForSport(gate.client, team.sport_id as string | null, FRONTEND_MODULE_KEYS.pond, team.id as string);
    pondByTeam.set(team.id as string, enabled);
  }));
  const visible = open.filter((row) => pondByTeam.get(row.team_id as string) === true);
  if (!visible.length) return [];
  const venueIds = [...new Set(visible.map((row) => row.venue_id as string).filter(Boolean))];
  const venues = venueIds.length ? await gate.client.from("venues").select("id, name").in("id", venueIds) : { data: [] as { id: string; name: string }[] };
  const teamName = new Map((teams.data ?? []).map((row) => [row.id as string, String(row.name ?? "")]));
  const venueName = new Map((venues.data ?? []).map((row) => [row.id as string, String(row.name ?? "")]));
  return visible
    .map((row) => ({
      eventId: row.id as string,
      teamName: teamName.get(row.team_id as string) ?? "",
      date: String(row.event_date).slice(0, 10),
      start: String(row.start_time).slice(0, 5),
      venue: venueName.get(row.venue_id as string) ?? "",
    }))
    .sort((left, right) => `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`));
}

export type PublicTraining = {
  id: string;
  date: string;
  time: string;
  venue: string;
  expense: string;
  playerPrice: string;
  teamName: string;
  ended: boolean;
  going: { userId: string; name: string; guest: boolean }[];
  viewer: "out" | "member" | "signed" | "guest";
  account: { name: string; email: string } | null;
};

async function openGuestEvent(eventId: string): Promise<{ ok: true; event: GuestEvent; teamName: string; venue: string } | { ok: false }> {
  const gate = await requireUserAdmin();
  const admin = gate?.client;
  if (!admin || !ID.test(eventId)) return { ok: false };
  const row = await admin
    .from("team_events")
    .select("id, team_id, event_date, start_time, event_type, with_coach, allow_guests, venue_id")
    .eq("id", eventId)
    .maybeSingle();
  if (row.error || !row.data) return { ok: false };
  const event = row.data as GuestEvent;
  if (event.event_type !== "training" || event.with_coach || !event.allow_guests) return { ok: false };
  const team = await admin.from("teams").select("id, name, sport_id").eq("id", event.team_id).maybeSingle();
  if (team.error || !team.data) return { ok: false };
  const pond = await moduleEnabledForSport(admin, team.data.sport_id as string | null, FRONTEND_MODULE_KEYS.pond, event.team_id);
  if (!pond) return { ok: false };
  const venue = await admin.from("venues").select("name").eq("id", event.venue_id).maybeSingle();
  return { ok: true, event, teamName: String(team.data.name ?? ""), venue: String(venue.data?.name ?? "").trim() };
}

function moneyLabel(value: unknown, currency: unknown): string {
  if (value == null || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  const code = typeof currency === "string" && currency.trim() ? currency : "EUR";
  return formatMoney(Math.round(amount * 100) / 100, code);
}

function displayName(row: { name?: string | null; first_name?: string | null; last_name?: string | null } | null): string {
  if (!row) return "";
  const parts = [row.first_name, row.last_name].map((part) => (part ?? "").trim()).filter(Boolean);
  if (parts.length) return parts.join(" ");
  return (row.name ?? "").trim();
}

export async function loadPublicTrainingForVisitor(eventId: string): Promise<PublicTraining | null> {
  const admin = createAdminClient();
  if (!admin || !ID.test(eventId)) return null;
  const row = await admin
    .from("team_events")
    .select("id, team_id, event_date, start_time, event_type, with_coach, allow_guests, venue_id, expense")
    .eq("id", eventId)
    .maybeSingle();
  if (row.error || !row.data) return null;
  const event = row.data as GuestEvent;
  if (event.event_type !== "training" || event.with_coach || !event.allow_guests) return null;
  const team = await admin.from("teams").select("id, name, sport_id, currency").eq("id", event.team_id).maybeSingle();
  if (team.error || !team.data) return null;
  const pond = await moduleEnabledForSport(admin, team.data.sport_id as string | null, FRONTEND_MODULE_KEYS.pond, event.team_id);
  if (!pond) return null;
  const [venue, rsvps, account] = await Promise.all([
    admin.from("venues").select("name, price_per_hour").eq("id", event.venue_id).maybeSingle(),
    admin.from("team_event_rsvps").select("user_id, is_guest").eq("event_id", event.id).eq("status", "going"),
    getAccountProfile(),
  ]);
  if (rsvps.error) return null;
  const userIds = [...new Set((rsvps.data ?? []).map((item) => item.user_id as string))];
  const people = userIds.length ? await admin.from("users").select("id, name, first_name, last_name").in("id", userIds) : { data: [] };
  const names = new Map((people.data ?? []).map((item) => [item.id as string, displayName(item)]));
  const brand = await getSiteBrand();
  let viewer: PublicTraining["viewer"] = "out";
  let signedIn: PublicTraining["account"] = null;
  if (account) {
    const member = await admin.from("team_members").select("user_id").eq("team_id", event.team_id).eq("user_id", account.id).maybeSingle();
    const signed = (rsvps.data ?? []).some((item) => item.user_id === account.id && item.is_guest === true);
    viewer = member.data ? "member" : signed ? "signed" : "guest";
    const name = [account.firstName, account.lastName].map((part) => part.trim()).filter(Boolean).join(" ");
    signedIn = { name: name || account.email, email: account.email };
  }
  return {
    id: event.id,
    date: formatDisplayDate(String(event.event_date).slice(0, 10), brand.display),
    time: formatClock(String(event.start_time).slice(0, 5), brand.display.timeFormat),
    venue: String(venue.data?.name ?? "").trim(),
    expense: moneyLabel(event.expense, team.data.currency),
    playerPrice: moneyLabel(venue.data?.price_per_hour, team.data.currency),
    teamName: String(team.data.name ?? ""),
    ended: eventHasEnded({ date: String(event.event_date).slice(0, 10), start: String(event.start_time).slice(0, 5) }),
    going: (rsvps.data ?? [])
      .map((item) => ({
        userId: item.user_id as string,
        name: names.get(item.user_id as string) ?? "",
        guest: item.is_guest === true,
      }))
      .sort((left, right) => Number(left.guest) - Number(right.guest) || left.name.localeCompare(right.name, "lv")),
    viewer,
    account: signedIn,
  };
}

async function canManage(teamId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  const gate = await requireUserAdmin();
  if (!gate) return false;
  const member = await gate.client.from("team_members").select("is_team_admin").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  if (member.data?.is_team_admin === true) return true;
  const team = await gate.client.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
  if (team.data?.leader_id === userId) return true;
  if (!isAdmin) return false;
  const watch = await gate.client.from("admin_team_watches").select("team_id").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  return Boolean(watch.data);
}

export async function setTrainingGuestsAllowed(input: { teamId: string; eventId: string; allowed: boolean }): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate || !ID.test(input.teamId) || !ID.test(input.eventId)) return { ok: false, error: "auth.error.generic" };
  if (!(await canManage(input.teamId, gate.account.id, gate.account.isAdmin))) return { ok: false, error: "auth.error.generic" };
  const event = await gate.client
    .from("team_events")
    .select("id, event_type, with_coach, team_id")
    .eq("id", input.eventId)
    .eq("team_id", input.teamId)
    .maybeSingle();
  if (event.error || !event.data) return { ok: false, error: "auth.error.generic" };
  if (event.data.event_type !== "training" || event.data.with_coach) return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("sport_id").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data) return { ok: false, error: "auth.error.generic" };
  const pond = await moduleEnabledForSport(gate.client, team.data.sport_id as string | null, FRONTEND_MODULE_KEYS.pond, input.teamId);
  if (!pond) return { ok: false, error: "frontend_modules.disabled" };
  const saved = await gate.client.from("team_events").update({ allow_guests: input.allowed }).eq("id", input.eventId).eq("team_id", input.teamId);
  if (saved.error) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true };
}

export async function joinTrainingAsGuest(eventId: string): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate || !ID.test(eventId)) return { ok: false, error: "auth.error.generic" };
  if (await rateLimit(`guest-join:${gate.account.id}`, 20, 15 * 60 * 1000)) return { ok: false, error: "auth.error.rate" };
  const opened = await openGuestEvent(eventId);
  if (!opened.ok) return { ok: false, error: "auth.error.generic" };
  if (eventHasEnded({ date: String(opened.event.event_date).slice(0, 10), start: String(opened.event.start_time).slice(0, 5) })) {
    return { ok: false, error: "pond.ended" };
  }
  const member = await gate.client.from("team_members").select("user_id").eq("team_id", opened.event.team_id).eq("user_id", gate.account.id).maybeSingle();
  if (member.data) return { ok: false, error: "pond.member" };
  const saved = await gate.client.from("team_event_rsvps").upsert(
    { team_id: opened.event.team_id, event_id: eventId, user_id: gate.account.id, status: "going", is_guest: true },
    { onConflict: "event_id,user_id" },
  );
  if (saved.error) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true };
}

export async function leaveTrainingAsGuest(eventId: string): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate || !ID.test(eventId)) return { ok: false, error: "auth.error.generic" };
  const removed = await gate.client.from("team_event_rsvps").delete().eq("event_id", eventId).eq("user_id", gate.account.id).eq("is_guest", true);
  if (removed.error) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true };
}

export async function saveGuestNote(input: { teamId: string; userId: string; note: string }): Promise<{ ok: true; note: string } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate || !ID.test(input.teamId) || !ID.test(input.userId)) return { ok: false, error: "auth.error.generic" };
  if (!(await canManage(input.teamId, gate.account.id, gate.account.isAdmin))) return { ok: false, error: "auth.error.generic" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "auth.error.generic" };
  const note = input.note.trim().slice(0, 500);
  const saved = note
    ? await admin.from("team_guest_notes").upsert({ team_id: input.teamId, user_id: input.userId, note, updated_at: new Date().toISOString() }, { onConflict: "team_id,user_id" })
    : await admin.from("team_guest_notes").delete().eq("team_id", input.teamId).eq("user_id", input.userId);
  if (saved.error) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true, note };
}

export async function removeTrainingGuest(input: { teamId: string; eventId: string; userId: string }): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate || !ID.test(input.teamId) || !ID.test(input.eventId) || !ID.test(input.userId)) return { ok: false, error: "auth.error.generic" };
  if (!(await canManage(input.teamId, gate.account.id, gate.account.isAdmin))) return { ok: false, error: "auth.error.generic" };
  const removed = await gate.client.from("team_event_rsvps").delete().eq("team_id", input.teamId).eq("event_id", input.eventId).eq("user_id", input.userId).eq("is_guest", true);
  if (removed.error) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true };
}

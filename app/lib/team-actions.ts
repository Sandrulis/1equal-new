"use server";

import { revalidatePath } from "next/cache";
import type { BalanceEntry, Member, TeamEvent, Venue } from "@/app/lib/demo-data";
import { parseEhlPlayerPage, parseEhlPlayerUrl, type EhlPlayerProfile } from "@/app/lib/ehl-player";
import { isEhlHost, parseEhlTeamUrl } from "@/app/lib/ehl-team";
import type { IssuedTeam } from "@/app/lib/invite-code";
import type { MessageKey } from "@/app/lib/messages";
import { eventFromRow, memberFromRow, requireUserAdmin } from "@/app/lib/team-membership";
import type { Subteam } from "@/app/lib/demo-data";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import { roleFromPosition } from "@/app/lib/team-creator";
import { createClient } from "@/app/lib/supabase/server";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type SaveResult = { ok: true; member: Member; teamCode: string } | { ok: false; error: MessageKey };
type CreateResult = { ok: true; team: IssuedTeam } | { ok: false; error: MessageKey };
type LookupResult = { ok: true; number: string; position: string; profile: EhlPlayerProfile } | { ok: false; error: MessageKey };

function inviteCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

function cleanLogo(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !isEhlHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) return null;
  return parsed;
}

function cleanText(value: string, max: number): string {
  return value.trim().slice(0, max);
}

async function fetchPlayer(raw: string): Promise<{ profile: EhlPlayerProfile } | { error: MessageKey }> {
  const url = parseEhlPlayerUrl(raw);
  if (!url) return { error: "user.player.invalid" };
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { accept: "text/html" },
    });
    const finalUrl = parseEhlPlayerUrl(response.url);
    if (!finalUrl) return { error: "user.player.invalid" };
    if (!response.ok) return { error: "user.player.failed" };
    const html = (await response.text()).slice(0, 200_000);
    const profile = parseEhlPlayerPage(html, finalUrl.toString());
    if (!profile) return { error: "user.player.not_found" };
    return { profile };
  } catch {
    return { error: "user.player.failed" };
  }
}

export async function lookupPlayerLink(raw: string): Promise<LookupResult> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const loaded = await fetchPlayer(raw);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  return {
    ok: true,
    number: loaded.profile.number ?? "",
    position: loaded.profile.position ?? "",
    profile: loaded.profile,
  };
}

export async function createOwnedTeam(input: { name: string; sourceUrl: string | null; logoUrl: string | null }): Promise<CreateResult> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "admin.error.name" };
  const source = input.sourceUrl ? parseEhlTeamUrl(input.sourceUrl)?.toString() ?? null : null;
  const logo = cleanLogo(input.logoUrl);
  const now = new Date().toISOString();

  let teamId = "";
  let code = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = inviteCode();
    const inserted = await gate.client.from("teams").insert({ name, invite_code: code, source_url: source, logo_url: logo, leader_id: gate.account.id, updated_at: now }).select("id").single();
    if (!inserted.error && inserted.data) {
      teamId = inserted.data.id;
      break;
    }
  }
  if (!teamId) return { ok: false, error: "auth.error.generic" };

  const memberInsert = await gate.client.from("team_members").insert({ team_id: teamId, user_id: gate.account.id }).select("team_id, user_id, jersey_number, position, phone, ehl_player, fee_exempt, joined_on, updated_at").single();
  if (memberInsert.error || !memberInsert.data) {
    await gate.client.from("teams").delete().eq("id", teamId);
    return { ok: false, error: "auth.error.generic" };
  }

  const member = memberFromRow({
    ...memberInsert.data,
    users: { email: gate.account.email, name: "", first_name: gate.account.firstName, last_name: gate.account.lastName },
  });
  if (!member.name) member.name = [gate.account.firstName, gate.account.lastName].filter(Boolean).join(" ");
  member.role = "captain";

  revalidatePath("/", "layout");
  return {
    ok: true,
    team: { id: teamId, name, code, demo: false, sourceUrl: source, logoUrl: logo, leaderId: gate.account.id, members: [member], subteams: [], venues: [], events: [] },
  };
}

export async function joinOwnedTeam(rawCode: string): Promise<CreateResult> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return { ok: false, error: "team.join.not_found" };
  const found = await gate.client.from("teams").select("id, name, invite_code, source_url, logo_url, leader_id").eq("invite_code", code).maybeSingle();
  if (found.error || !found.data?.invite_code) return { ok: false, error: "team.join.not_found" };

  await gate.client.from("team_members").upsert({ team_id: found.data.id, user_id: gate.account.id }, { onConflict: "team_id,user_id", ignoreDuplicates: true });
  const members = await gate.client
    .from("team_members")
    .select("team_id, user_id, jersey_number, position, phone, ehl_player, fee_exempt, joined_on, updated_at, users(email, name, first_name, last_name)")
    .eq("team_id", found.data.id);
  if (members.error || !members.data) return { ok: false, error: "auth.error.generic" };
  const [groups, links, places, events] = await Promise.all([
    gate.client.from("subteams").select("id, name, color, updated_at").eq("team_id", found.data.id),
    gate.client.from("team_member_subteams").select("user_id, subteam_id").eq("team_id", found.data.id),
    gate.client.from("venues").select("id, name, price_per_hour, hidden, updated_at").eq("team_id", found.data.id),
    gate.client.from("team_events").select("id, team_id, event_date, start_time, event_type, venue_id, subteam_id, expense, with_coach").eq("team_id", found.data.id).order("event_date").order("start_time"),
  ]);
  const idsByUser = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const list = idsByUser.get(link.user_id) ?? [];
    list.push(link.subteam_id);
    idsByUser.set(link.user_id, list);
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    team: {
      id: found.data.id,
      name: found.data.name,
      code: found.data.invite_code,
      demo: false,
      sourceUrl: found.data.source_url,
      logoUrl: found.data.logo_url,
      leaderId: found.data.leader_id,
      members: members.data.map((row) => memberFromRow(row, idsByUser.get(row.user_id) ?? [])),
      subteams: (groups.data ?? []).map((row) => ({ id: row.id, name: row.name, color: row.color, updatedAt: toLocalDateTimeStamp(row.updated_at) })),
      venues: (places.data ?? []).map(venueFromRow),
      events: (events.data ?? []).map(eventFromRow),
    },
  };
}

export async function saveMemberProfile(input: {
  teamId: string;
  userId: string;
  number: string;
  position: string;
  phone: string;
  playerUrl: string;
  subteamIds: string[];
  feeExempt: boolean;
}): Promise<SaveResult> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", input.teamId).eq("user_id", gate.account.id).maybeSingle();
  const target = await gate.client.from("team_members").select("user_id").eq("team_id", input.teamId).eq("user_id", input.userId).maybeSingle();
  if (actor.error || !actor.data || target.error || !target.data) return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("invite_code").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data?.invite_code) return { ok: false, error: "auth.error.generic" };

  let player: EhlPlayerProfile | null = null;
  const rawUrl = input.playerUrl.trim();
  if (rawUrl) {
    const loaded = await fetchPlayer(rawUrl);
    if ("error" in loaded) return { ok: false, error: loaded.error };
    player = loaded.profile;
  }

  const allowed = await gate.client.from("subteams").select("id").eq("team_id", input.teamId);
  const allowedIds = new Set((allowed.data ?? []).map((row) => row.id));
  const subteamIds = [...new Set(input.subteamIds.filter((id) => allowedIds.has(id)))];
  const number = cleanNumber(input.number) ?? (player?.number ? cleanNumber(player.number) : null);
  const position = cleanText(input.position || player?.position || "", 40);
  const phone = cleanText(input.phone, 40);
  const updated = await gate.client
    .from("team_members")
    .update({ jersey_number: number, position, phone, ehl_player: player, fee_exempt: input.feeExempt, updated_at: new Date().toISOString() })
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
    .select("team_id, user_id, jersey_number, position, phone, ehl_player, fee_exempt, joined_on, updated_at, users(email, name, first_name, last_name)")
    .single();
  if (updated.error || !updated.data) return { ok: false, error: "auth.error.generic" };

  await gate.client.from("team_member_subteams").delete().eq("team_id", input.teamId).eq("user_id", input.userId);
  if (subteamIds.length) {
    const linked = await gate.client.from("team_member_subteams").insert(subteamIds.map((subteamId) => ({ team_id: input.teamId, user_id: input.userId, subteam_id: subteamId })));
    if (linked.error) return { ok: false, error: "auth.error.generic" };
  }

  if (input.userId === gate.account.id) {
    const supabase = await createClient();
    await supabase.rpc("update_own_profile", {
      user_first_name: gate.account.firstName,
      user_last_name: gate.account.lastName,
      user_ehl_team: team.data.invite_code,
      user_ehl_player: player,
      user_ehl_set: true,
    });
  }

  const member = memberFromRow(updated.data, subteamIds);
  if (player?.name) member.name = player.name;
  member.role = roleFromPosition(member.position);
  revalidatePath("/", "layout");
  return { ok: true, member, teamCode: team.data.invite_code };
}

export async function removeOwnedMember(teamId: string, userId: string): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error || !actor.data) return { ok: false, error: "auth.error.generic" };
  const removed = await gate.client.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  if (removed.error) return { ok: false, error: "auth.error.generic" };
  const left = await gate.client.from("team_members").select("user_id").eq("team_id", teamId);
  if (!left.error && (left.data?.length ?? 0) === 0) await gate.client.from("teams").delete().eq("id", teamId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveOwnedSubteam(input: { teamId: string; id: string | null; name: string; color: string }): Promise<{ ok: true; subteam: Subteam } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", input.teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error || !actor.data) return { ok: false, error: "auth.error.generic" };
  const name = input.name.trim().slice(0, 80);
  const color = /^#[0-9A-Fa-f]{6}$/.test(input.color) ? input.color : "#0f6e82";
  if (!name) return { ok: false, error: "admin.error.name" };
  const now = new Date().toISOString();
  const saved = input.id
    ? await gate.client.from("subteams").update({ name, color, updated_at: now }).eq("id", input.id).eq("team_id", input.teamId).select("id, name, color, updated_at").single()
    : await gate.client.from("subteams").insert({ team_id: input.teamId, name, color, updated_at: now }).select("id, name, color, updated_at").single();
  if (saved.error || !saved.data) return { ok: false, error: "auth.error.generic" };
  revalidatePath("/", "layout");
  return { ok: true, subteam: { id: saved.data.id, name: saved.data.name, color: saved.data.color, updatedAt: toLocalDateTimeStamp(saved.data.updated_at) } };
}

export async function adjustMemberBalance(input: {
  teamId: string;
  userId: string;
  amount: number;
}): Promise<{ ok: true; balance: number; ledger: BalanceEntry[] } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount === 0) return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("leader_id").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data || team.data.leader_id !== gate.account.id) return { ok: false, error: "auth.error.generic" };
  const target = await gate.client.from("team_members").select("user_id").eq("team_id", input.teamId).eq("user_id", input.userId).maybeSingle();
  if (target.error || !target.data) return { ok: false, error: "auth.error.generic" };
  const inserted = await gate.client
    .from("balance_entries")
    .insert({ team_id: input.teamId, user_id: input.userId, amount, kind: "manual", created_by: gate.account.id })
    .select("id, amount, created_at")
    .single();
  if (inserted.error || !inserted.data) return { ok: false, error: "auth.error.generic" };
  const rows = await gate.client
    .from("balance_entries")
    .select("id, amount, created_at")
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false });
  if (rows.error || !rows.data) return { ok: false, error: "auth.error.generic" };
  const ledger = rows.data.map((row) => ({ id: row.id, amount: Number(row.amount), at: toLocalDateTimeStamp(row.created_at) }));
  const balance = Math.round(ledger.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  revalidatePath("/", "layout");
  return { ok: true, balance, ledger };
}

function venueFromRow(row: { id: string; name: string; price_per_hour: number | string; hidden: boolean; updated_at: string }): Venue {
  return {
    id: row.id,
    name: row.name,
    area: "",
    pricePerHour: Number(row.price_per_hour),
    hidden: row.hidden === true,
    updatedAt: toLocalDateTimeStamp(row.updated_at),
  };
}

export async function saveOwnedVenue(input: { teamId: string; id: string | null; name: string; pricePerHour: number }): Promise<{ ok: true; venue: Venue } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", input.teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error || !actor.data) return { ok: false, error: "auth.error.generic" };
  const name = input.name.trim().slice(0, 80);
  const price = Math.round(Number(input.pricePerHour) * 100) / 100;
  if (!name || !Number.isFinite(price) || price < 0) return { ok: false, error: "admin.error.name" };
  const now = new Date().toISOString();
  const saved = input.id
    ? await gate.client.from("venues").update({ name, price_per_hour: price, updated_at: now }).eq("id", input.id).eq("team_id", input.teamId).select("id, name, price_per_hour, hidden, updated_at").single()
    : await gate.client.from("venues").insert({ team_id: input.teamId, name, price_per_hour: price, updated_at: now }).select("id, name, price_per_hour, hidden, updated_at").single();
  if (saved.error || !saved.data) return { ok: false, error: "auth.error.generic" };
  revalidatePath("/", "layout");
  return { ok: true, venue: venueFromRow(saved.data) };
}

export async function hideOwnedVenue(teamId: string, venueId: string): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error || !actor.data) return { ok: false, error: "auth.error.generic" };
  const hidden = await gate.client.from("venues").update({ hidden: true, updated_at: new Date().toISOString() }).eq("id", venueId).eq("team_id", teamId);
  if (hidden.error) return { ok: false, error: "auth.error.generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createOwnedEvent(input: {
  teamId: string;
  date: string;
  start: string;
  type: "game" | "training";
  venueId: string;
  subteamId: string | null;
  expense: number | null;
  withCoach: boolean;
}): Promise<{ ok: true; event: TeamEvent } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", input.teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error || !actor.data) return { ok: false, error: "auth.error.generic" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.start)) return { ok: false, error: "auth.error.generic" };
  if (input.type !== "game" && input.type !== "training") return { ok: false, error: "auth.error.generic" };
  const venue = await gate.client.from("venues").select("id").eq("id", input.venueId).eq("team_id", input.teamId).eq("hidden", false).maybeSingle();
  if (venue.error || !venue.data) return { ok: false, error: "auth.error.generic" };
  const subteamId = input.subteamId || null;
  if (subteamId) {
    const group = await gate.client.from("subteams").select("id").eq("id", subteamId).eq("team_id", input.teamId).maybeSingle();
    if (group.error || !group.data) return { ok: false, error: "auth.error.generic" };
  }
  const expense = input.type === "game" ? Math.round(Number(input.expense) * 100) / 100 : null;
  if (input.type === "game" && (!Number.isFinite(expense) || expense == null || expense < 0 || expense > 1_000_000)) return { ok: false, error: "auth.error.generic" };
  const inserted = await gate.client
    .from("team_events")
    .insert({
      team_id: input.teamId,
      event_date: input.date,
      start_time: input.start,
      event_type: input.type,
      venue_id: input.venueId,
      subteam_id: subteamId,
      expense,
      with_coach: input.type === "training" && input.withCoach,
    })
    .select("id, team_id, event_date, start_time, event_type, venue_id, subteam_id, expense, with_coach")
    .single();
  if (inserted.error || !inserted.data) return { ok: false, error: "auth.error.generic" };
  revalidatePath("/", "layout");
  return { ok: true, event: eventFromRow(inserted.data) };
}

export async function deleteOwnedSubteam(teamId: string, subteamId: string): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error || !actor.data) return { ok: false, error: "auth.error.generic" };
  const removed = await gate.client.from("subteams").delete().eq("id", subteamId).eq("team_id", teamId);
  if (removed.error) return { ok: false, error: "auth.error.generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}

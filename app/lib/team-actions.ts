"use server";

import { ownAvatarUrl, removeAvatar, uploadAvatarJpeg } from "@/app/lib/avatar-storage";
import { refreshTeamData } from "@/app/lib/cache-tags";
import { writeAudit } from "@/app/lib/security/audit";
import type { BalanceEntry, Member, TeamEvent, Venue } from "@/app/lib/demo-data";
import { BALANCE_ENTRY_SELECT, mapBalanceEntry } from "@/app/lib/balance-entry";
import { mergeStoredEhlPlayer, parseEhlPlayerPage, parseEhlPlayerUrl, type EhlPlayerProfile } from "@/app/lib/ehl-player";
import { isEhlHost, parseEhlTeamUrl } from "@/app/lib/ehl-team";
import { castMemberVote } from "@/app/lib/attendance-vote";
import { isEmailAddress } from "@/app/lib/email/email-address";
import { emailTakenByOther, requestEmailChange } from "@/app/lib/email/email-change";
import { notifyNewEvent } from "@/app/lib/email/event-mail";
import { eventHasEnded } from "@/app/lib/event-voting";
import type { IssuedTeam, TeamLedgerLine } from "@/app/lib/invite-code";
import type { MessageKey } from "@/app/lib/messages";
import { eventFromRow, memberFromRow, requireUserAdmin, TEAM_MEMBER_COLUMNS, TEAM_MEMBER_USER_COLUMNS } from "@/app/lib/team-membership";
import type { Subteam } from "@/app/lib/demo-data";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import { DEFAULT_GAME_VOTING_HOURS, DEFAULT_TRAINING_VOTING_HOURS, isCurrency, votingHours, type CreateTeamInput } from "@/app/lib/team-defaults";
import { normalizePositionCode, serializeExtraPositions } from "@/app/lib/positions";
import { roleFromPosition } from "@/app/lib/team-creator";
import { rateLimit } from "@/app/lib/security/rate-limit";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type SaveResult = { ok: true; member: Member; teamCode: string; emailSent?: boolean } | { ok: false; error: MessageKey };
type CreateResult = { ok: true; team: IssuedTeam } | { ok: false; error: MessageKey };
type LookupResult = { ok: true; number: string; position: string; profile: EhlPlayerProfile } | { ok: false; error: MessageKey };

async function attachSport(
  client: NonNullable<Awaited<ReturnType<typeof requireUserAdmin>>> extends infer Gate ? (Gate extends { client: infer Client } ? Client : never) : never,
  requested: string | null | undefined,
): Promise<{ ok: true; sportId: string } | { ok: false; error: MessageKey }> {
  const rows = await client.from("sports").select("id").eq("is_active", true).order("sort_order");
  if (rows.error) return { ok: false, error: "auth.error.generic" };
  const ids = (rows.data ?? []).map((row) => row.id as string);
  if (ids.length === 0) return { ok: false, error: "sports.error.last" };
  if (ids.length === 1) return { ok: true, sportId: ids[0] };
  if (requested && ids.includes(requested)) return { ok: true, sportId: requested };
  return { ok: false, error: "sports.error.required" };
}

type GateClient = NonNullable<Awaited<ReturnType<typeof requireUserAdmin>>>["client"];

async function managesTeam(client: GateClient, teamId: string, userId: string): Promise<boolean> {
  const team = await client.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
  if (team.error || !team.data) return false;
  if (team.data.leader_id === userId) return true;
  const row = await client.from("team_members").select("is_team_admin").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  return !row.error && row.data?.is_team_admin === true;
}

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

function cleanPersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
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
    position: normalizePositionCode(loaded.profile.position) || loaded.profile.position || "",
    profile: loaded.profile,
  };
}

export async function createOwnedTeam(input: CreateTeamInput): Promise<CreateResult> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "admin.error.name" };
  const training = votingHours(input.trainingVotingHours);
  const game = votingHours(input.gameVotingHours);
  if (training == null || game == null) return { ok: false, error: "site_settings.error.team_defaults" };
  const currency = input.currency && isCurrency(input.currency) ? input.currency : null;
  const source = input.sourceUrl ? parseEhlTeamUrl(input.sourceUrl)?.toString() ?? null : null;
  const logo = source ? cleanLogo(input.logoUrl) : null;
  const sport = await attachSport(gate.client, input.sportId);
  if (!sport.ok) return sport;
  const now = new Date().toISOString();

  let teamId = "";
  let code = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = inviteCode();
    const inserted = await gate.client.from("teams").insert({ name, invite_code: code, source_url: source, logo_url: logo, leader_id: gate.account.id, currency, training_voting_hours: training, game_voting_hours: game, sport_id: sport.sportId, updated_at: now }).select("id").single();
    if (!inserted.error && inserted.data) {
      teamId = inserted.data.id;
      break;
    }
  }
  if (!teamId) return { ok: false, error: "auth.error.generic" };

  const memberInsert = await gate.client.from("team_members").insert({ team_id: teamId, user_id: gate.account.id }).select(TEAM_MEMBER_COLUMNS).single();
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

  refreshTeamData();
  return {
    ok: true,
    team: { id: teamId, name, code, demo: false, sourceUrl: source, logoUrl: logo, leaderId: gate.account.id, currency, trainingVotingHours: training, gameVotingHours: game, sportId: sport.sportId, balance: 0, rsvps: [], members: [member], subteams: [], venues: [], events: [] },
  };
}

export async function updateOwnedTeam(input: {
  teamId: string;
  name: string;
  currency: string | null;
  trainingVotingHours: number;
  gameVotingHours: number;
  sourceUrl: string | null;
  logoUrl: string | null;
  sportId?: string | null;
}): Promise<{ ok: true; name: string; currency: string | null; trainingVotingHours: number; gameVotingHours: number; sourceUrl: string | null; logoUrl: string | null; sportId?: string } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const name = input.name.trim().slice(0, 80);
  const training = votingHours(input.trainingVotingHours);
  const game = votingHours(input.gameVotingHours);
  const currency = input.currency && isCurrency(input.currency) ? input.currency : null;
  if (input.currency && !currency) return { ok: false, error: "site_settings.error.team_defaults" };
  if (!name) return { ok: false, error: "site_settings.error.name" };
  if (training == null || game == null) return { ok: false, error: "site_settings.error.team_defaults" };
  const source = input.sourceUrl ? parseEhlTeamUrl(input.sourceUrl)?.toString() ?? null : null;
  if (input.sourceUrl && !source) return { ok: false, error: "team.link.invalid" };
  const ownLogo = ownAvatarUrl(input.logoUrl, `teams/${input.teamId}.jpg`);
  const logo = source ? cleanLogo(input.logoUrl) : ownLogo;
  let sportId: string | undefined;
  if (input.sportId !== undefined) {
    const sport = await attachSport(gate.client, input.sportId);
    if (!sport.ok) return sport;
    sportId = sport.sportId;
  }
  if (!(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const saved = await gate.client
    .from("teams")
    .update({ name, currency, training_voting_hours: training, game_voting_hours: game, source_url: source, logo_url: logo, ...(sportId ? { sport_id: sportId } : {}), updated_at: new Date().toISOString() })
    .eq("id", input.teamId);
  if (saved.error) return { ok: false, error: "auth.error.generic" };
  if (!ownLogo) await removeAvatar(`teams/${input.teamId}.jpg`);
  refreshTeamData();
  return { ok: true, name, currency, trainingVotingHours: training, gameVotingHours: game, sourceUrl: source, logoUrl: logo, sportId };
}

export async function saveTeamAvatar(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const teamId = String(formData.get("teamId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return { ok: false, error: "auth.error.generic" };
  if (!(await managesTeam(gate.client, teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "avatar.error.file" };
  const uploaded = await uploadAvatarJpeg(file, `teams/${teamId}.jpg`, gate.account.id);
  if ("error" in uploaded) return { ok: false, error: uploaded.error };
  return { ok: true, url: uploaded.url };
}

export async function joinOwnedTeam(rawCode: string): Promise<CreateResult> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return { ok: false, error: "team.join.not_found" };
  if (await rateLimit(`join:${gate.account.id}`, 10, 15 * 60 * 1000)) return { ok: false, error: "feedback.error.rate" };
  const found = await gate.client.from("teams").select("id, name, invite_code, source_url, logo_url, leader_id, training_voting_hours, game_voting_hours, currency, balance").eq("invite_code", code).maybeSingle();
  if (found.error || !found.data?.invite_code) return { ok: false, error: "team.join.not_found" };

  await gate.client.from("team_members").upsert({ team_id: found.data.id, user_id: gate.account.id }, { onConflict: "team_id,user_id", ignoreDuplicates: true });
  const members = await gate.client
    .from("team_members")
    .select(TEAM_MEMBER_USER_COLUMNS)
    .eq("team_id", found.data.id);
  if (members.error || !members.data) return { ok: false, error: "auth.error.generic" };
  const [groups, links, places, events] = await Promise.all([
    gate.client.from("subteams").select("id, name, color, updated_at").eq("team_id", found.data.id),
    gate.client.from("team_member_subteams").select("user_id, subteam_id").eq("team_id", found.data.id),
    gate.client.from("venues").select("id, name, price_per_hour, hidden, updated_at").eq("team_id", found.data.id),
    gate.client.from("team_events").select("id, team_id, event_date, start_time, event_type, venue_id, subteam_id, expense, with_coach, lineup").eq("team_id", found.data.id).order("event_date").order("start_time"),
  ]);
  const idsByUser = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const list = idsByUser.get(link.user_id) ?? [];
    list.push(link.subteam_id);
    idsByUser.set(link.user_id, list);
  }

  refreshTeamData();
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
      trainingVotingHours: found.data.training_voting_hours ?? DEFAULT_TRAINING_VOTING_HOURS,
      gameVotingHours: found.data.game_voting_hours ?? DEFAULT_GAME_VOTING_HOURS,
      currency: found.data.currency,
      balance: Number(found.data.balance ?? 0),
      rsvps: [],
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
  extraPositions: string[];
  phone: string;
  playerUrl: string;
  subteamIds: string[];
  feeExempt: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  teamAdmin?: boolean;
}): Promise<SaveResult> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", input.teamId).eq("user_id", gate.account.id).maybeSingle();
  const target = await gate.client.from("team_members").select("user_id").eq("team_id", input.teamId).eq("user_id", input.userId).maybeSingle();
  if (actor.error || !actor.data || target.error || !target.data) return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("invite_code, leader_id").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data?.invite_code) return { ok: false, error: "auth.error.generic" };

  if ((input.teamAdmin === true || input.teamAdmin === false) && (team.data.leader_id !== gate.account.id || input.userId === team.data.leader_id)) {
    return { ok: false, error: "auth.error.generic" };
  }

  const manager = await managesTeam(gate.client, input.teamId, gate.account.id);
  const self = input.userId === gate.account.id;
  if (!manager && !self) return { ok: false, error: "auth.error.generic" };

  const wantsIdentity = input.firstName !== undefined || input.lastName !== undefined || input.email !== undefined;
  let pendingEmail: string | null = null;
  if (wantsIdentity) {
    const firstName = cleanPersonName(input.firstName ?? "");
    const lastName = cleanPersonName(input.lastName ?? "");
    const email = (input.email ?? "").trim().toLowerCase();
    if (!firstName || !lastName) return { ok: false, error: "roster.error.name" };
    if (!isEmailAddress(email)) return { ok: false, error: "roster.error.email" };
    const account = await gate.client.from("users").select("email").eq("id", input.userId).maybeSingle();
    if (account.error || !account.data) return { ok: false, error: "auth.error.generic" };
    const currentEmail = account.data.email.trim().toLowerCase();
    if (email !== currentEmail) {
      if (await rateLimit(`email-change:${input.userId}`, 5, 15 * 60 * 1000)) return { ok: false, error: "auth.error.rate" };
      const taken = await emailTakenByOther(gate.client, email, input.userId);
      if (taken === null) return { ok: false, error: "auth.error.generic" };
      if (taken) return { ok: false, error: "auth.error.exists" };
      pendingEmail = email;
    }
    const fullName = `${firstName} ${lastName}`.trim();
    const named = await gate.client.from("users").update({ first_name: firstName, last_name: lastName, name: fullName }).eq("id", input.userId);
    if (named.error) return { ok: false, error: "auth.error.generic" };
    const authUser = await gate.client.auth.admin.getUserById(input.userId);
    const metadata = authUser.data.user?.user_metadata;
    const userMetadata = metadata && typeof metadata === "object" ? metadata : {};
    await gate.client.auth.admin.updateUserById(input.userId, { user_metadata: { ...userMetadata, first_name: firstName, last_name: lastName, name: fullName } });
  }

  let player: EhlPlayerProfile | null = null;
  const rawUrl = input.playerUrl.trim();
  if (rawUrl) {
    const loaded = await fetchPlayer(rawUrl);
    if ("error" in loaded) return { ok: false, error: loaded.error };
    player = loaded.profile;
  }

  const allowed = manager ? await gate.client.from("subteams").select("id").eq("team_id", input.teamId) : null;
  if (allowed?.error) return { ok: false, error: "auth.error.generic" };
  const allowedIds = new Set((allowed?.data ?? []).map((row) => row.id));
  const keptLinks = manager ? null : await gate.client.from("team_member_subteams").select("subteam_id").eq("team_id", input.teamId).eq("user_id", input.userId);
  if (keptLinks?.error) return { ok: false, error: "auth.error.generic" };
  const subteamIds = manager ? [...new Set(input.subteamIds.filter((id) => allowedIds.has(id)))] : (keptLinks?.data ?? []).map((row) => row.subteam_id);
  const number = cleanNumber(input.number) ?? (player?.number ? cleanNumber(player.number) : null);
  const position = normalizePositionCode(input.position) || normalizePositionCode(player?.position || "");
  const extraPositions = serializeExtraPositions(input.extraPositions, position);
  const phone = cleanText(input.phone, 40);
  const memberPatch: {
    jersey_number: number | null;
    position: string;
    extra_positions: string;
    phone: string;
    ehl_player: EhlPlayerProfile | null;
    fee_exempt?: boolean;
    updated_at: string;
    is_team_admin?: boolean;
  } = { jersey_number: number, position, extra_positions: extraPositions, phone, ehl_player: player, updated_at: new Date().toISOString() };
  if (manager) memberPatch.fee_exempt = input.feeExempt;
  if (manager && (input.teamAdmin === true || input.teamAdmin === false)) memberPatch.is_team_admin = input.teamAdmin;
  const updated = await gate.client
    .from("team_members")
    .update(memberPatch)
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
    .select(TEAM_MEMBER_USER_COLUMNS)
    .single();
  if (updated.error || !updated.data) return { ok: false, error: "auth.error.generic" };

  if (manager) {
    await gate.client.from("team_member_subteams").delete().eq("team_id", input.teamId).eq("user_id", input.userId);
    if (subteamIds.length) {
      const linked = await gate.client.from("team_member_subteams").insert(subteamIds.map((subteamId) => ({ team_id: input.teamId, user_id: input.userId, subteam_id: subteamId })));
      if (linked.error) return { ok: false, error: "auth.error.generic" };
    }
  }

  if (input.userId === gate.account.id && /^[A-Z0-9]{4,16}$/.test(team.data.invite_code)) {
    const current = await gate.client.from("users").select("ehl_player").eq("id", gate.account.id).maybeSingle();
    if (current.error) return { ok: false, error: "auth.error.generic" };
    const saved = await gate.client.from("users").update({ ehl_player: mergeStoredEhlPlayer(current.data?.ehl_player, team.data.invite_code, player) }).eq("id", gate.account.id);
    if (saved.error) return { ok: false, error: "auth.error.generic" };
  }

  const member = memberFromRow(updated.data, subteamIds);
  member.role = roleFromPosition(member.position);
  let emailSent = false;
  if (pendingEmail) {
    emailSent = await requestEmailChange(gate.client, input.userId, pendingEmail);
    if (!emailSent) return { ok: false, error: "auth.email.unavailable" };
    await writeAudit("member.email_request", "users", input.userId, { teamId: input.teamId });
  }
  if (wantsIdentity) await writeAudit("member.profile", "users", input.userId, { teamId: input.teamId });
  if (input.teamAdmin === true || input.teamAdmin === false) await writeAudit("member.admin", "team_members", input.userId, { teamId: input.teamId, admin: input.teamAdmin });
  refreshTeamData();
  return { ok: true, member, teamCode: team.data.invite_code, emailSent };
}

export async function setMemberTeamAdmin(input: {
  teamId: string;
  userId: string;
  admin: boolean;
}): Promise<{ ok: true; admin: boolean } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (input.admin !== true && input.admin !== false) return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("leader_id").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data || team.data.leader_id !== gate.account.id) return { ok: false, error: "auth.error.generic" };
  if (input.userId === team.data.leader_id) return { ok: false, error: "auth.error.generic" };
  const updated = await gate.client
    .from("team_members")
    .update({ is_team_admin: input.admin, updated_at: new Date().toISOString() })
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
    .select("user_id")
    .maybeSingle();
  if (updated.error || !updated.data) return { ok: false, error: "auth.error.generic" };
  await writeAudit("member.admin", "team_members", input.userId, { teamId: input.teamId, admin: input.admin });
  refreshTeamData();
  return { ok: true, admin: input.admin };
}

export async function removeOwnedMember(teamId: string, userId: string): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("team_id").eq("team_id", teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error || !actor.data) return { ok: false, error: "auth.error.generic" };
  const self = userId === gate.account.id;
  if (!self && !(await managesTeam(gate.client, teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const removed = await gate.client.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  if (removed.error) return { ok: false, error: "auth.error.generic" };
  await writeAudit("member.remove", "team_members", userId, { teamId });
  const left = await gate.client.from("team_members").select("user_id").eq("team_id", teamId);
  if (!left.error && (left.data?.length ?? 0) === 0) await gate.client.from("teams").delete().eq("id", teamId);
  refreshTeamData();
  return { ok: true };
}

export async function saveOwnedSubteam(input: { teamId: string; id: string | null; name: string; color: string }): Promise<{ ok: true; subteam: Subteam } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (!(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const name = input.name.trim().slice(0, 80);
  const color = /^#[0-9A-Fa-f]{6}$/.test(input.color) ? input.color : "#0f6e82";
  if (!name) return { ok: false, error: "admin.error.name" };
  const now = new Date().toISOString();
  const saved = input.id
    ? await gate.client.from("subteams").update({ name, color, updated_at: now }).eq("id", input.id).eq("team_id", input.teamId).select("id, name, color, updated_at").single()
    : await gate.client.from("subteams").insert({ team_id: input.teamId, name, color, updated_at: now }).select("id, name, color, updated_at").single();
  if (saved.error || !saved.data) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
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
  if (!(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const target = await gate.client.from("team_members").select("user_id").eq("team_id", input.teamId).eq("user_id", input.userId).maybeSingle();
  if (target.error || !target.data) return { ok: false, error: "auth.error.generic" };
  const inserted = await gate.client
    .from("balance_entries")
    .insert({ team_id: input.teamId, user_id: input.userId, amount, kind: "manual", created_by: gate.account.id })
    .select("id, amount, created_at")
    .single();
  if (inserted.error || !inserted.data) return { ok: false, error: "auth.error.generic" };
  await writeAudit("balance.adjust", "balance_entries", inserted.data.id, { teamId: input.teamId, userId: input.userId, amount });
  const rows = await gate.client
    .from("balance_entries")
    .select(BALANCE_ENTRY_SELECT)
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false });
  if (rows.error || !rows.data) return { ok: false, error: "auth.error.generic" };
  const ledger = rows.data.map((row) => mapBalanceEntry(row));
  const balance = Math.round(ledger.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  refreshTeamData();
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
  if (!(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const name = input.name.trim().slice(0, 80);
  const price = Math.round(Number(input.pricePerHour) * 100) / 100;
  if (!name || !Number.isFinite(price) || price < 0) return { ok: false, error: "admin.error.name" };
  const now = new Date().toISOString();
  const saved = input.id
    ? await gate.client.from("venues").update({ name, price_per_hour: price, updated_at: now }).eq("id", input.id).eq("team_id", input.teamId).select("id, name, price_per_hour, hidden, updated_at").single()
    : await gate.client.from("venues").insert({ team_id: input.teamId, name, price_per_hour: price, updated_at: now }).select("id, name, price_per_hour, hidden, updated_at").single();
  if (saved.error || !saved.data) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true, venue: venueFromRow(saved.data) };
}

export async function hideOwnedVenue(teamId: string, venueId: string): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (!(await managesTeam(gate.client, teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const hidden = await gate.client.from("venues").update({ hidden: true, updated_at: new Date().toISOString() }).eq("id", venueId).eq("team_id", teamId);
  if (hidden.error) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
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
  if (!(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !eventStartOk(input.start)) return { ok: false, error: "auth.error.generic" };
  if (input.type !== "game" && input.type !== "training") return { ok: false, error: "auth.error.generic" };
  const venue = await gate.client.from("venues").select("id").eq("id", input.venueId).eq("team_id", input.teamId).eq("hidden", false).maybeSingle();
  if (venue.error || !venue.data) return { ok: false, error: "auth.error.generic" };
  const subteamId = input.subteamId || null;
  if (subteamId) {
    const group = await gate.client.from("subteams").select("id").eq("id", subteamId).eq("team_id", input.teamId).maybeSingle();
    if (group.error || !group.data) return { ok: false, error: "auth.error.generic" };
  }
  const expense = storedExpense(input.type, input.expense);
  if (expense === undefined) return { ok: false, error: "auth.error.generic" };
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
  const event = eventFromRow(inserted.data);
  await notifyNewEvent(event, input.teamId);
  refreshTeamData();
  return { ok: true, event };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function eventStartOk(start: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(start);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 8 && hour <= 22 && minute >= 0 && minute <= 55 && minute % 5 === 0;
}

function storedExpense(type: "game" | "training", value: number | null): number | null | undefined {
  if (value == null) return type === "training" ? null : undefined;
  const expense = roundMoney(Number(value));
  if (!Number.isFinite(expense) || expense < 0 || expense > 1_000_000) return undefined;
  return expense;
}

async function readTeamLedger(client: NonNullable<Awaited<ReturnType<typeof requireUserAdmin>>>["client"], teamId: string): Promise<TeamLedgerLine[] | null> {
  const rows = await client.from("team_ledger").select("id, event_id, amount, event_date, event_type, created_at").eq("team_id", teamId).order("created_at", { ascending: false });
  if (rows.error || !rows.data) return null;
  return rows.data.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    at: toLocalDateTimeStamp(row.created_at),
    eventId: row.event_id,
    eventDate: String(row.event_date).slice(0, 10),
    eventType: row.event_type === "game" ? "game" : "training",
  }));
}

async function bumpBalance(client: NonNullable<Awaited<ReturnType<typeof requireUserAdmin>>>["client"], teamId: string, delta: number): Promise<number | null> {
  const bumped = await client.rpc("adjust_team_balance", { target: teamId, delta });
  if (bumped.error || bumped.data == null) return null;
  return roundMoney(Number(bumped.data));
}

async function applyEventSettlement(
  client: NonNullable<Awaited<ReturnType<typeof requireUserAdmin>>>["client"],
  teamId: string,
  event: { id: string; date: string; start: string; end: string; type: "game" | "training"; expense: number | null },
  settledAt: string | null,
): Promise<number | null> {
  const team = await client.from("teams").select("balance").eq("id", teamId).maybeSingle();
  if (team.error || !team.data) return null;
  const balance = roundMoney(Number(team.data.balance ?? 0));
  const expense = event.expense != null ? roundMoney(event.expense) : 0;
  const ended = eventHasEnded(event);
  const line = await client.from("team_ledger").select("id, amount").eq("event_id", event.id).maybeSingle();
  if (line.error) return null;
  const charged = line.data ? Math.abs(Number(line.data.amount)) : 0;
  if (settledAt && line.data && (!ended || expense <= 0)) {
    const next = await bumpBalance(client, teamId, charged);
    if (next == null) return null;
    await client.from("team_ledger").delete().eq("id", line.data.id);
    await client.from("team_events").update({ settled_at: null }).eq("id", event.id);
    return next;
  }
  if (settledAt && line.data && charged !== expense) {
    const next = await bumpBalance(client, teamId, -(expense - charged));
    if (next == null) return null;
    await client.from("team_ledger").update({ amount: -expense, event_date: event.date, event_type: event.type }).eq("id", line.data.id);
    return next;
  }
  if (!settledAt && ended && expense > 0) {
    const claimed = await client.from("team_events").update({ settled_at: new Date().toISOString() }).eq("id", event.id).is("settled_at", null).select("id");
    if (claimed.error || !claimed.data?.length) return balance;
    const inserted = await client.from("team_ledger").insert({
      team_id: teamId,
      event_id: event.id,
      amount: -expense,
      event_date: event.date,
      event_type: event.type,
    });
    if (inserted.error) {
      await client.from("team_events").update({ settled_at: null }).eq("id", event.id);
      return balance;
    }
    const next = await bumpBalance(client, teamId, -expense);
    if (next == null) return null;
    return next;
  }
  return balance;
}

export async function updateOwnedEvent(input: {
  teamId: string;
  eventId: string;
  date: string;
  start: string;
  type: "game" | "training";
  venueId: string;
  subteamId: string | null;
  expense: number | null;
  withCoach: boolean;
}): Promise<{ ok: true; event: TeamEvent; teamBalance: number; ledger: TeamLedgerLine[] } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (!(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !eventStartOk(input.start)) return { ok: false, error: "auth.error.generic" };
  if (input.type !== "game" && input.type !== "training") return { ok: false, error: "auth.error.generic" };
  const existing = await gate.client.from("team_events").select("id, settled_at").eq("id", input.eventId).eq("team_id", input.teamId).maybeSingle();
  if (existing.error || !existing.data) return { ok: false, error: "auth.error.generic" };
  const venue = await gate.client.from("venues").select("id").eq("id", input.venueId).eq("team_id", input.teamId).eq("hidden", false).maybeSingle();
  if (venue.error || !venue.data) return { ok: false, error: "auth.error.generic" };
  const subteamId = input.subteamId || null;
  if (subteamId) {
    const group = await gate.client.from("subteams").select("id").eq("id", subteamId).eq("team_id", input.teamId).maybeSingle();
    if (group.error || !group.data) return { ok: false, error: "auth.error.generic" };
  }
  const expense = storedExpense(input.type, input.expense);
  if (expense === undefined) return { ok: false, error: "auth.error.generic" };
  const updated = await gate.client
    .from("team_events")
    .update({
      event_date: input.date,
      start_time: input.start,
      event_type: input.type,
      venue_id: input.venueId,
      subteam_id: subteamId,
      expense,
      with_coach: input.type === "training" && input.withCoach,
    })
    .eq("id", input.eventId)
    .eq("team_id", input.teamId)
    .select("id, team_id, event_date, start_time, event_type, venue_id, subteam_id, expense, with_coach")
    .single();
  if (updated.error || !updated.data) return { ok: false, error: "auth.error.generic" };
  const event = eventFromRow(updated.data);
  const teamBalance = await applyEventSettlement(gate.client, input.teamId, { ...event, expense: event.expense ?? null }, existing.data.settled_at);
  if (teamBalance == null) return { ok: false, error: "auth.error.generic" };
  const ledger = await readTeamLedger(gate.client, input.teamId);
  if (!ledger) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true, event, teamBalance, ledger };
}

export async function saveOwnedLineup(input: {
  teamId: string;
  eventId: string;
  slots?: Record<number, string>;
  sides?: Record<string, "black" | "white">;
}): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "lineup.save.error" };
  if (!(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "lineup.save.error" };
  const event = await gate.client.from("team_events").select("id, event_type").eq("id", input.eventId).eq("team_id", input.teamId).maybeSingle();
  if (event.error || !event.data) return { ok: false, error: "lineup.save.error" };
  const members = await gate.client.from("team_members").select("user_id").eq("team_id", input.teamId);
  if (members.error || !members.data) return { ok: false, error: "lineup.save.error" };
  const allowed = new Set(members.data.map((row) => row.user_id));
  const lineup = event.data.event_type === "game" ? { slots: cleanSlots(input.slots, allowed) } : { sides: cleanSides(input.sides, allowed) };
  const saved = await gate.client.from("team_events").update({ lineup }).eq("id", input.eventId).eq("team_id", input.teamId);
  if (saved.error) return { ok: false, error: "lineup.save.error" };
  return { ok: true };
}

function cleanSlots(slots: Record<number, string> | undefined, allowed: Set<string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, memberId] of Object.entries(slots ?? {})) {
    const slot = Number(key);
    if (!Number.isInteger(slot) || slot < 1 || slot > 16 || !allowed.has(memberId)) continue;
    next[String(slot)] = memberId;
  }
  return next;
}

function cleanSides(sides: Record<string, "black" | "white"> | undefined, allowed: Set<string>): Record<string, "black" | "white"> {
  const next: Record<string, "black" | "white"> = {};
  for (const [memberId, side] of Object.entries(sides ?? {})) {
    if (!allowed.has(memberId) || (side !== "black" && side !== "white")) continue;
    next[memberId] = side;
  }
  return next;
}

export async function deleteOwnedEvent(input: {
  teamId: string;
  eventId: string;
}): Promise<{ ok: true; teamBalance: number; ledger: TeamLedgerLine[]; refunds: { userId: string; balance: number; ledger: BalanceEntry[] }[] } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("balance").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data || !(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const event = await gate.client.from("team_events").select("id").eq("id", input.eventId).eq("team_id", input.teamId).maybeSingle();
  if (event.error || !event.data) return { ok: false, error: "auth.error.generic" };
  const charges = await gate.client.from("balance_entries").select("user_id, amount").eq("event_id", input.eventId).eq("kind", "event");
  if (charges.error) return { ok: false, error: "auth.error.generic" };
  const lines = await gate.client.from("team_ledger").select("amount").eq("event_id", input.eventId);
  if (lines.error) return { ok: false, error: "auth.error.generic" };
  const refundTotal = (charges.data ?? []).reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
  const settledSum = (lines.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const previous = roundMoney(Number(team.data.balance ?? 0));
  const delta = roundMoney(-refundTotal - settledSum);
  const teamBalance = delta === 0 ? previous : await bumpBalance(gate.client, input.teamId, delta);
  if (teamBalance == null) return { ok: false, error: "auth.error.generic" };
  const removed = await gate.client.from("team_events").delete().eq("id", input.eventId).eq("team_id", input.teamId);
  if (removed.error) {
    if (delta !== 0) await bumpBalance(gate.client, input.teamId, -delta);
    return { ok: false, error: "auth.error.generic" };
  }
  const userIds = [...new Set((charges.data ?? []).map((row) => row.user_id))];
  const refunds: { userId: string; balance: number; ledger: BalanceEntry[] }[] = [];
  if (userIds.length) {
    const rows = await gate.client.from("balance_entries").select(BALANCE_ENTRY_SELECT).eq("team_id", input.teamId).in("user_id", userIds).order("created_at", { ascending: false });
    if (rows.error || !rows.data) return { ok: false, error: "auth.error.generic" };
    for (const userId of userIds) {
      const ledger = rows.data.filter((row) => row.user_id === userId).map((row) => mapBalanceEntry(row));
      refunds.push({ userId, balance: roundMoney(ledger.reduce((sum, item) => sum + item.amount, 0)), ledger });
    }
  }
  const ledger = await readTeamLedger(gate.client, input.teamId);
  if (!ledger) return { ok: false, error: "auth.error.generic" };
  await writeAudit("event.delete", "team_events", input.eventId, { teamId: input.teamId });
  refreshTeamData();
  return { ok: true, teamBalance, ledger, refunds };
}

export async function setEventAttendance(input: {
  teamId: string;
  eventId: string;
  userId: string;
  status: "going" | "absent" | "pending";
}): Promise<{ ok: true; memberBalance: number; ledger: BalanceEntry[]; teamBalance: number; reservation: { eventId: string; userId: string; amount: number } | null } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (input.status !== "going" && input.status !== "absent" && input.status !== "pending") return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("leader_id").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("user_id, is_team_admin").eq("team_id", input.teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error || !actor.data) return { ok: false, error: "auth.error.generic" };
  const manage = team.data.leader_id === gate.account.id || actor.data.is_team_admin === true;
  if (input.userId !== gate.account.id && !manage) return { ok: false, error: "auth.error.generic" };
  const result = await castMemberVote(gate.client, {
    teamId: input.teamId,
    eventId: input.eventId,
    userId: input.userId,
    status: input.status,
    actorId: gate.account.id,
    enforceDeadline: !manage,
  });
  if (result.ok) refreshTeamData();
  return result;
}

export async function deleteOwnedSubteam(teamId: string, subteamId: string): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (!(await managesTeam(gate.client, teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const removed = await gate.client.from("subteams").delete().eq("id", subteamId).eq("team_id", teamId);
  if (removed.error) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true };
}

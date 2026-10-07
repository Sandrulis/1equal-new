"use server";

import { recordTeamOrigin, requestCountryCode } from "@/app/lib/admin-origin";
import { ownAvatarUrl, removeAvatar, uploadAvatarJpeg } from "@/app/lib/avatar-storage";
import { refreshTeamData } from "@/app/lib/cache-tags";
import { writeAudit } from "@/app/lib/security/audit";
import type { Member, TeamEvent, Venue } from "@/app/lib/demo-data";
import { mergeStoredEhlPlayer, parseEhlPlayerPage, parseEhlPlayerUrl, type EhlPlayerProfile } from "@/app/lib/ehl-player";
import { isEhlHost, parseEhlTeamUrl } from "@/app/lib/ehl-team";
import { fetchEhlTeamKits } from "@/app/lib/ehl-team-lookup";
import { teamLogoUrl } from "@/app/lib/entuziasti-view";
import { isOwnAvatarUrl } from "@/app/lib/avatar-url";
import { FRONTEND_MODULE_KEYS } from "@/app/lib/frontend-modules";
import { moduleEnabledForSport } from "@/app/lib/sport-module";
import { castMemberVote } from "@/app/lib/attendance-vote";
import { isEmailAddress } from "@/app/lib/email/email-address";
import { sendTeamInvite } from "@/app/lib/email/invite-mail";
import { emailTakenByOther, requestEmailChange } from "@/app/lib/email/email-change";
import { notifyNewEvent } from "@/app/lib/email/event-mail";
import { eventHasEnded } from "@/app/lib/event-voting";
import type { IssuedTeam } from "@/app/lib/invite-code";
import type { MessageKey } from "@/app/lib/messages";
import { historySince } from "@/app/lib/history-window";
import { eventFromRow, memberFromRow, readMemberBalance, requireUserAdmin, TEAM_EVENT_COLUMNS, TEAM_MEMBER_COLUMNS, TEAM_MEMBER_USER_COLUMNS } from "@/app/lib/team-membership";
import type { Subteam } from "@/app/lib/demo-data";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import { DEFAULT_GAME_VOTING_HOURS, DEFAULT_TRAINING_VOTING_HOURS, isCurrency, votingHours, type CreateTeamInput } from "@/app/lib/team-defaults";
import { normalizePositionCode, resolvePositionCode, serializeExtraPositions, type PositionCatalogItem } from "@/app/lib/positions";
import { roleFromPosition } from "@/app/lib/team-creator";
import { normalizeJoinCode, JOIN_INVITE_COOKIE } from "@/app/lib/join-invite";
import { rateLimit } from "@/app/lib/security/rate-limit";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { cookies } from "next/headers";

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

async function sportPositionCatalog(client: GateClient, sportId: string | null): Promise<PositionCatalogItem[] | null> {
  if (!sportId) return [];
  const rows = await client.from("sport_positions").select("code, sort_order").eq("sport_id", sportId).order("sort_order");
  if (rows.error) return null;
  return ((rows.data ?? []) as { code: string }[]).map((row) => ({ code: row.code }));
}

async function entuziastiForNewTeam(sportId: string): Promise<{ enabled: boolean; individual: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { enabled: false, individual: false };
  const moduleRow = await admin.from("site_frontend_modules").select("is_enabled, is_individual").eq("module_key", FRONTEND_MODULE_KEYS.entuziasti).maybeSingle();
  if (moduleRow.error || !moduleRow.data?.is_enabled) return { enabled: false, individual: false };
  const link = await admin.from("sport_modules").select("module_key").eq("sport_id", sportId).eq("module_key", FRONTEND_MODULE_KEYS.entuziasti).maybeSingle();
  if (link.error || !link.data) return { enabled: false, individual: moduleRow.data.is_individual === true };
  return { enabled: true, individual: moduleRow.data.is_individual === true };
}

async function rememberActiveTeam(client: GateClient, userId: string, teamId: string) {
  await client.from("users").update({ active_team_id: teamId }).eq("id", userId);
}

export async function setActiveTeam(teamId: string | null): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (!teamId) {
    const cleared = await gate.client.from("users").update({ active_team_id: null }).eq("id", gate.account.id);
    if (cleared.error) return { ok: false, error: "auth.error.generic" };
    return { ok: true };
  }
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return { ok: false, error: "auth.error.generic" };
  const member = await gate.client.from("team_members").select("team_id").eq("team_id", teamId).eq("user_id", gate.account.id).maybeSingle();
  let allowed = Boolean(member.data);
  if (!allowed && gate.account.isAdmin) {
    const watch = await gate.client.from("admin_team_watches").select("team_id").eq("team_id", teamId).eq("user_id", gate.account.id).maybeSingle();
    allowed = Boolean(watch.data);
  }
  if (!allowed) return { ok: false, error: "auth.error.generic" };
  const saved = await gate.client.from("users").update({ active_team_id: teamId }).eq("id", gate.account.id);
  if (saved.error) return { ok: false, error: "auth.error.generic" };
  return { ok: true };
}

async function watchesTeam(client: GateClient, teamId: string, userId: string): Promise<boolean> {
  const user = await client.from("users").select("is_admin").eq("id", userId).maybeSingle();
  if (user.error || user.data?.is_admin !== true) return false;
  const watch = await client.from("admin_team_watches").select("team_id").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  return !watch.error && Boolean(watch.data);
}

async function managesTeam(client: GateClient, teamId: string, userId: string): Promise<boolean> {
  const team = await client.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
  if (team.error || !team.data) return false;
  if (team.data.leader_id === userId) return true;
  const row = await client.from("team_members").select("is_team_admin").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  if (!row.error && row.data?.is_team_admin === true) return true;
  return watchesTeam(client, teamId, userId);
}

function inviteCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

function presentKit(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

async function kitColumns(source: string | null): Promise<{ home_kit_url: string | null; away_kit_url: string | null } | null> {
  if (!source) return { home_kit_url: null, away_kit_url: null };
  const kits = await fetchEhlTeamKits(source);
  if (!kits) return null;
  return { home_kit_url: kits.homeKitUrl ?? "", away_kit_url: kits.awayKitUrl ?? "" };
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
  const sport = await attachSport(gate.client, input.sportId);
  if (!sport.ok) return sport;
  const moduleState = await entuziastiForNewTeam(sport.sportId);
  const presetEntuziasti = moduleState.enabled && moduleState.individual && (await requestCountryCode()) === "LV";
  const parsed = input.sourceUrl ? parseEhlTeamUrl(input.sourceUrl) : null;
  if (moduleState.enabled && input.sourceUrl && !parsed) return { ok: false, error: "team.link.invalid" };
  const entuziasti = presetEntuziasti || Boolean(parsed && moduleState.enabled) || (await moduleEnabledForSport(gate.client, sport.sportId, FRONTEND_MODULE_KEYS.entuziasti));
  const source = entuziasti && parsed ? parsed.toString() : null;
  const logo = source ? cleanLogo(input.logoUrl) : null;
  const kits = await kitColumns(source);
  const now = new Date().toISOString();

  let teamId = "";
  let code = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = inviteCode();
    const inserted = await gate.client.from("teams").insert({ name, invite_code: code, source_url: source, logo_url: logo, home_kit_url: kits?.home_kit_url ?? null, away_kit_url: kits?.away_kit_url ?? null, leader_id: gate.account.id, currency, training_voting_hours: training, game_voting_hours: game, sport_id: sport.sportId, updated_at: now }).select("id").single();
    if (!inserted.error && inserted.data) {
      teamId = inserted.data.id;
      break;
    }
  }
  if (!teamId) return { ok: false, error: "auth.error.generic" };
  let moduleKeys: string[] = [];
  if (presetEntuziasti || (source && moduleState.individual)) {
    const linked = await gate.client.from("team_modules").upsert({ team_id: teamId, module_key: FRONTEND_MODULE_KEYS.entuziasti }, { onConflict: "team_id,module_key" });
    if (!linked.error) moduleKeys = [FRONTEND_MODULE_KEYS.entuziasti];
  }
  await recordTeamOrigin(teamId);

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

  await rememberActiveTeam(gate.client, gate.account.id, teamId);
  refreshTeamData();
  return {
    ok: true,
    team: { id: teamId, name, code, demo: false, sourceUrl: source, logoUrl: logo, homeKitUrl: presentKit(kits?.home_kit_url), awayKitUrl: presentKit(kits?.away_kit_url), leaderId: gate.account.id, currency, trainingVotingHours: training, gameVotingHours: game, sportId: sport.sportId, moduleKeys, balance: 0, rsvps: [], members: [member], subteams: [], venues: [], events: [] },
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
}): Promise<{ ok: true; name: string; currency: string | null; trainingVotingHours: number; gameVotingHours: number; sourceUrl: string | null; logoUrl: string | null; homeKitUrl: string | null; awayKitUrl: string | null; sportId?: string } | { ok: false; error: MessageKey }> {
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
  const ownLogo = ownAvatarUrl(input.logoUrl, `teams/${input.teamId}.jpg`);
  const logo = source ? cleanLogo(input.logoUrl) : ownLogo;
  let sportId: string | undefined;
  if (input.sportId !== undefined) {
    const sport = await attachSport(gate.client, input.sportId);
    if (!sport.ok) return sport;
    sportId = sport.sportId;
  }
  if (!(await managesTeam(gate.client, input.teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const current = await gate.client.from("teams").select("source_url, logo_url, sport_id, home_kit_url, away_kit_url").eq("id", input.teamId).maybeSingle();
  if (current.error || !current.data) return { ok: false, error: "auth.error.generic" };
  const entuziasti = await moduleEnabledForSport(gate.client, sportId ?? current.data.sport_id, FRONTEND_MODULE_KEYS.entuziasti, input.teamId);
  if (entuziasti && input.sourceUrl && !source) return { ok: false, error: "team.link.invalid" };
  const keptSource = entuziasti ? source : current.data.source_url;
  const keptLogo = entuziasti ? logo : current.data.logo_url;
  const sourceChanged = keptSource !== current.data.source_url;
  const kitsMissing = current.data.home_kit_url == null && current.data.away_kit_url == null;
  let kits: { home_kit_url: string | null; away_kit_url: string | null } | null = null;
  if (!keptSource) kits = { home_kit_url: null, away_kit_url: null };
  else if (sourceChanged || kitsMissing) {
    kits = (await kitColumns(keptSource)) ?? (sourceChanged ? { home_kit_url: null, away_kit_url: null } : null);
  }
  const homeKitUrl = kits ? kits.home_kit_url : current.data.home_kit_url;
  const awayKitUrl = kits ? kits.away_kit_url : current.data.away_kit_url;
  const saved = await gate.client
    .from("teams")
    .update({ name, currency, training_voting_hours: training, game_voting_hours: game, source_url: keptSource, logo_url: keptLogo, ...(kits ? { home_kit_url: kits.home_kit_url, away_kit_url: kits.away_kit_url } : {}), ...(sportId ? { sport_id: sportId } : {}), updated_at: new Date().toISOString() })
    .eq("id", input.teamId);
  if (saved.error) return { ok: false, error: "auth.error.generic" };
  if (entuziasti && !ownLogo) await removeAvatar(`teams/${input.teamId}.jpg`);
  refreshTeamData();
  return { ok: true, name, currency, trainingVotingHours: training, gameVotingHours: game, sourceUrl: keptSource, logoUrl: keptLogo, homeKitUrl: presentKit(homeKitUrl), awayKitUrl: presentKit(awayKitUrl), sportId };
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
  const found = await gate.client.from("teams").select("id, name, invite_code, source_url, logo_url, home_kit_url, away_kit_url, leader_id, training_voting_hours, game_voting_hours, currency, balance").eq("invite_code", code).maybeSingle();
  if (found.error || !found.data?.invite_code) return { ok: false, error: "team.join.not_found" };
  if (found.data.source_url && found.data.home_kit_url == null && found.data.away_kit_url == null) {
    const kits = await kitColumns(found.data.source_url);
    if (kits) {
      found.data.home_kit_url = kits.home_kit_url;
      found.data.away_kit_url = kits.away_kit_url;
      const admin = createAdminClient();
      if (admin) await admin.from("teams").update({ home_kit_url: kits.home_kit_url, away_kit_url: kits.away_kit_url }).eq("id", found.data.id);
    }
  }

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
    gate.client.from("team_events").select(TEAM_EVENT_COLUMNS).eq("team_id", found.data.id).gte("event_date", historySince()).order("event_date").order("start_time"),
  ]);
  const idsByUser = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const list = idsByUser.get(link.user_id) ?? [];
    list.push(link.subteam_id);
    idsByUser.set(link.user_id, list);
  }

  refreshTeamData();
  await rememberActiveTeam(gate.client, gate.account.id, found.data.id);
  return {
    ok: true,
    team: {
      id: found.data.id,
      name: found.data.name,
      code: found.data.invite_code,
      demo: false,
      sourceUrl: found.data.source_url,
      logoUrl: found.data.logo_url,
      homeKitUrl: presentKit(found.data.home_kit_url),
      awayKitUrl: presentKit(found.data.away_kit_url),
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
  if (actor.error || target.error || !target.data) return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("invite_code, leader_id, sport_id").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data?.invite_code) return { ok: false, error: "auth.error.generic" };
  const manager = await managesTeam(gate.client, input.teamId, gate.account.id);
  const leads = team.data.leader_id === gate.account.id || (manager && !actor.data);

  if ((input.teamAdmin === true || input.teamAdmin === false) && (!leads || input.userId === team.data.leader_id)) {
    return { ok: false, error: "auth.error.generic" };
  }

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
  const entuziasti = await moduleEnabledForSport(gate.client, team.data.sport_id, FRONTEND_MODULE_KEYS.entuziasti, input.teamId);
  const rawUrl = entuziasti ? input.playerUrl.trim() : "";
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
  const catalog = await sportPositionCatalog(gate.client, team.data.sport_id);
  if (!catalog) return { ok: false, error: "auth.error.generic" };
  const position = resolvePositionCode(input.position, catalog) || resolvePositionCode(player?.position || "", catalog);
  const extraPositions = serializeExtraPositions(input.extraPositions, position, catalog);
  const phone = cleanText(input.phone, 40);
  const memberPatch: {
    jersey_number: number | null;
    position: string;
    extra_positions: string;
    phone: string;
    ehl_player?: EhlPlayerProfile | null;
    fee_exempt?: boolean;
    updated_at: string;
    is_team_admin?: boolean;
  } = { jersey_number: number, position, extra_positions: extraPositions, phone, updated_at: new Date().toISOString() };
  if (entuziasti) memberPatch.ehl_player = player;
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

  if (entuziasti && input.userId === gate.account.id && /^[A-Z0-9]{4,16}$/.test(team.data.invite_code)) {
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
  if (team.error || !team.data) return { ok: false, error: "auth.error.generic" };
  const leads = team.data.leader_id === gate.account.id || await watchesTeam(gate.client, input.teamId, gate.account.id);
  if (!leads) return { ok: false, error: "auth.error.generic" };
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
  if (actor.error) return { ok: false, error: "auth.error.generic" };
  const self = userId === gate.account.id && Boolean(actor.data);
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
}): Promise<{ ok: true; balance: number } | { ok: false; error: MessageKey }> {
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
  const balance = await readMemberBalance(gate.client, input.teamId, input.userId);
  if (balance == null) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true, balance };
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
  home: "home" | "away" | null;
}): Promise<{ ok: true; event: TeamEvent; teamBalance: number } | { ok: false; error: MessageKey }> {
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
  if (input.type === "game" && input.home !== "home" && input.home !== "away") return { ok: false, error: "auth.error.generic" };
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
      is_home: input.type === "game" ? input.home === "home" : null,
    })
    .select(TEAM_EVENT_COLUMNS)
    .single();
  if (inserted.error || !inserted.data) return { ok: false, error: "auth.error.generic" };
  const event = eventFromRow(inserted.data);
  const chargeNow = !(await financeCronEnabled(gate.client));
  let teamBalance: number;
  if (chargeNow) {
    const next = await applyEventSettlement(gate.client, input.teamId, { ...event, expense: event.expense ?? null }, null, true);
    if (next == null) {
      await gate.client.from("team_events").delete().eq("id", event.id);
      return { ok: false, error: "auth.error.generic" };
    }
    const fresh = await gate.client.from("team_events").select("settled_at").eq("id", event.id).maybeSingle();
    if (fresh.error || ((event.expense ?? 0) > 0 && !fresh.data?.settled_at)) {
      await gate.client.from("team_events").delete().eq("id", event.id);
      return { ok: false, error: "auth.error.generic" };
    }
    event.settled = Boolean(fresh.data?.settled_at);
    teamBalance = next;
  } else {
    const team = await gate.client.from("teams").select("balance").eq("id", input.teamId).maybeSingle();
    if (team.error || !team.data) return { ok: false, error: "auth.error.generic" };
    teamBalance = roundMoney(Number(team.data.balance ?? 0));
  }
  await notifyNewEvent(event, input.teamId, gate.account.id);
  refreshTeamData();
  return { ok: true, event, teamBalance };
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

async function bumpBalance(client: NonNullable<Awaited<ReturnType<typeof requireUserAdmin>>>["client"], teamId: string, delta: number): Promise<number | null> {
  const bumped = await client.rpc("adjust_team_balance", { target: teamId, delta });
  if (bumped.error || bumped.data == null) return null;
  return roundMoney(Number(bumped.data));
}

async function financeCronEnabled(client: NonNullable<Awaited<ReturnType<typeof requireUserAdmin>>>["client"]): Promise<boolean> {
  const flag = await client.from("cron_jobs").select("enabled").eq("job_key", "finance").maybeSingle();
  return !flag.error && flag.data?.enabled === true;
}

async function applyEventSettlement(
  client: NonNullable<Awaited<ReturnType<typeof requireUserAdmin>>>["client"],
  teamId: string,
  event: { id: string; date: string; start: string; end: string; type: "game" | "training"; expense: number | null },
  settledAt: string | null,
  chargeNow = false,
): Promise<number | null> {
  const team = await client.from("teams").select("balance").eq("id", teamId).maybeSingle();
  if (team.error || !team.data) return null;
  const balance = roundMoney(Number(team.data.balance ?? 0));
  const expense = event.expense != null ? roundMoney(event.expense) : 0;
  const ended = eventHasEnded(event);
  const due = chargeNow || ended;
  const line = await client.from("team_ledger").select("id, amount").eq("event_id", event.id).maybeSingle();
  if (line.error) return null;
  const charged = line.data ? Math.abs(Number(line.data.amount)) : 0;
  if (settledAt && line.data && (expense <= 0 || (!chargeNow && !ended))) {
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
  if (!settledAt && due && expense > 0) {
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
  home: "home" | "away" | null;
}): Promise<{ ok: true; event: TeamEvent; teamBalance: number } | { ok: false; error: MessageKey }> {
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
  if (input.type === "game" && input.home !== "home" && input.home !== "away") return { ok: false, error: "auth.error.generic" };
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
      is_home: input.type === "game" ? input.home === "home" : null,
      ...(input.type !== "training" || input.withCoach ? { allow_guests: false } : {}),
    })
    .eq("id", input.eventId)
    .eq("team_id", input.teamId)
    .select(TEAM_EVENT_COLUMNS)
    .single();
  if (updated.error || !updated.data) return { ok: false, error: "auth.error.generic" };
  const event = eventFromRow(updated.data);
  const chargeNow = !(await financeCronEnabled(gate.client));
  const teamBalance = await applyEventSettlement(gate.client, input.teamId, { ...event, expense: event.expense ?? null }, existing.data.settled_at, chargeNow);
  if (teamBalance == null) return { ok: false, error: "auth.error.generic" };
  const fresh = await gate.client.from("team_events").select("settled_at").eq("id", event.id).maybeSingle();
  if (fresh.error) return { ok: false, error: "auth.error.generic" };
  refreshTeamData();
  return { ok: true, event: { ...event, settled: Boolean(fresh.data?.settled_at) }, teamBalance };
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
}): Promise<{ ok: true; teamBalance: number; refunds: { userId: string; balance: number }[] } | { ok: false; error: MessageKey }> {
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
  const userIds = [...new Set((charges.data ?? []).map((row) => row.user_id as string))];
  const refunds: { userId: string; balance: number }[] = [];
  if (userIds.length) {
    const totals = await gate.client.rpc("member_balance_totals", { team_ids: [input.teamId] });
    if (totals.error || !totals.data) return { ok: false, error: "auth.error.generic" };
    const byUser = new Map((totals.data as { user_id: string; total: number | string }[]).map((row) => [row.user_id, roundMoney(Number(row.total))]));
    for (const userId of userIds) refunds.push({ userId, balance: byUser.get(userId) ?? 0 });
  }
  await writeAudit("event.delete", "team_events", input.eventId, { teamId: input.teamId });
  refreshTeamData();
  return { ok: true, teamBalance, refunds };
}

export async function setEventAttendance(input: {
  teamId: string;
  eventId: string;
  userId: string;
  status: "going" | "absent" | "pending";
}): Promise<{ ok: true; memberBalance: number; teamBalance: number; reservation: { eventId: string; userId: string; amount: number } | null } | { ok: false; error: MessageKey }> {
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (input.status !== "going" && input.status !== "absent" && input.status !== "pending") return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("leader_id").eq("id", input.teamId).maybeSingle();
  if (team.error || !team.data) return { ok: false, error: "auth.error.generic" };
  const actor = await gate.client.from("team_members").select("user_id, is_team_admin").eq("team_id", input.teamId).eq("user_id", gate.account.id).maybeSingle();
  if (actor.error) return { ok: false, error: "auth.error.generic" };
  const watching = !actor.data && (await watchesTeam(gate.client, input.teamId, gate.account.id));
  if (!actor.data && !watching) return { ok: false, error: "auth.error.generic" };
  if (input.userId === gate.account.id && !actor.data) return { ok: false, error: "auth.error.generic" };
  const manage = team.data.leader_id === gate.account.id || actor.data?.is_team_admin === true || watching;
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

export async function inviteTeamPlayer(teamId: string, rawEmails: string[]): Promise<{ ok: true; count: number } | { ok: false; error: MessageKey }> {
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return { ok: false, error: "auth.error.generic" };
  const emails = [...new Set(rawEmails.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  if (!emails.length || emails.length > 20 || emails.some((email) => !isEmailAddress(email))) return { ok: false, error: "roster.error.email" };
  const gate = await requireUserAdmin();
  if (!gate) return { ok: false, error: "auth.error.generic" };
  if (!(await managesTeam(gate.client, teamId, gate.account.id))) return { ok: false, error: "auth.error.generic" };
  const team = await gate.client.from("teams").select("name, invite_code, logo_url, sport_id").eq("id", teamId).maybeSingle();
  const code = normalizeJoinCode(team.data?.invite_code);
  if (team.error || !team.data || !code) return { ok: false, error: "auth.error.generic" };
  const entuziasti = await moduleEnabledForSport(gate.client, team.data.sport_id, FRONTEND_MODULE_KEYS.entuziasti, teamId);
  const imageUrl = teamLogoUrl(team.data.logo_url, entuziasti);
  const inviter = [gate.account.firstName, gate.account.lastName].map((part) => part.trim()).filter(Boolean).join(" ") || gate.account.email;
  let sent = 0;
  for (const email of emails) {
    if (await rateLimit(`invite:${teamId}:${email}`, 5, 15 * 60 * 1000)) return sent ? { ok: true, count: sent } : { ok: false, error: "auth.error.rate" };
    const ok = await sendTeamInvite({
      admin: gate.client,
      email,
      teamName: team.data.name,
      inviteCode: code,
      inviterName: inviter,
      imageUrl,
      imageFit: isOwnAvatarUrl(imageUrl) ? "cover" : "contain",
    });
    if (!ok) return sent ? { ok: true, count: sent } : { ok: false, error: "auth.email.unavailable" };
    sent += 1;
  }
  await writeAudit("team.invite", "teams", teamId);
  return { ok: true, count: sent };
}

export async function inspectJoinLink(rawCode: string): Promise<{ ok: true; state: "auth" | "ready" } | { ok: false; error: MessageKey }> {
  const code = normalizeJoinCode(rawCode);
  if (!code) return { ok: false, error: "team.join.not_found" };
  const gate = await requireUserAdmin();
  const admin = gate?.client ?? createAdminClient();
  if (!admin) return { ok: false, error: "auth.error.config" };
  const found = await admin.from("teams").select("id").eq("invite_code", code).maybeSingle();
  if (found.error || !found.data) return { ok: false, error: "team.join.not_found" };
  return { ok: true, state: gate ? "ready" : "auth" };
}

export async function openJoinLink(rawCode: string): Promise<{ ok: true; state: "joined" | "auth" } | { ok: false; error: MessageKey }> {
  const code = normalizeJoinCode(rawCode);
  if (!code) return { ok: false, error: "team.join.not_found" };
  const gate = await requireUserAdmin();
  if (!gate) {
    const admin = createAdminClient();
    if (!admin) return { ok: false, error: "auth.error.config" };
    const found = await admin.from("teams").select("id").eq("invite_code", code).maybeSingle();
    if (found.error || !found.data) return { ok: false, error: "team.join.not_found" };
    return { ok: true, state: "auth" };
  }
  const joined = await joinOwnedTeam(code);
  if (!joined.ok) return joined;
  return { ok: true, state: "joined" };
}

export async function acceptStoredJoin(): Promise<{ joined: boolean }> {
  const store = await cookies();
  const code = normalizeJoinCode(store.get(JOIN_INVITE_COOKIE)?.value);
  if (!code) return { joined: false };
  store.delete(JOIN_INVITE_COOKIE);
  const gate = await requireUserAdmin();
  if (!gate) return { joined: false };
  const joined = await joinOwnedTeam(code);
  return { joined: joined.ok };
}

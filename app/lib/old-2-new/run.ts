import { randomBytes } from "node:crypto";
import { normalizePositionCode } from "@/app/lib/positions";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { buildPreview } from "@/app/lib/old-2-new/preview";
import { MoveError, loadPingvini, type OldUser, type PingviniData } from "@/app/lib/old-2-new/snapshot";
import type { ProgressEvent, ScanReport, StepId } from "@/app/lib/old-2-new/types";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

function adminClient(): Admin {
  const client = createAdminClient();
  if (!client) throw new MoveError("old2new.error.service");
  return client;
}

async function teamExists(admin: Admin, inviteCode: string): Promise<boolean> {
  if (!inviteCode) return false;
  const { data, error } = await admin.from("teams").select("id").eq("invite_code", inviteCode).maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

async function existingEmails(admin: Admin, emails: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let index = 0; index < emails.length; index += 80) {
    const part = emails.slice(index, index + 80);
    const { data, error } = await admin.from("users").select("email").in("email", part);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (typeof row.email === "string") found.add(row.email.toLowerCase());
    }
  }
  return found;
}

export async function scanPingvini(): Promise<ScanReport> {
  const data = await loadPingvini();
  const admin = createAdminClient();
  if (!admin) {
    return {
      teamName: data.teamName,
      inviteCode: data.inviteCode,
      balance: data.balance,
      counts: data.counts,
      alreadyInNewDb: false,
      canWrite: false,
      preview: buildPreview(data, new Set()),
    };
  }
  const [alreadyInNewDb, emails] = await Promise.all([
    teamExists(admin, data.inviteCode),
    existingEmails(admin, data.users.map((user) => user.email)),
  ]);
  return {
    teamName: data.teamName,
    inviteCode: data.inviteCode,
    balance: data.balance,
    counts: { ...data.counts, existingUsers: emails.size },
    alreadyInNewDb,
    canWrite: true,
    preview: buildPreview(data, emails),
  };
}

function emit(onProgress: (event: ProgressEvent) => void, step: StepId, done: number, total: number, state: ProgressEvent["state"]) {
  onProgress({ step, done, total, state });
}

async function inChunks<T>(rows: T[], size: number, write: (part: T[]) => Promise<void>, onPart: (done: number) => void) {
  for (let index = 0; index < rows.length; index += size) {
    const part = rows.slice(index, index + size);
    await write(part);
    onPart(Math.min(rows.length, index + part.length));
  }
}

function hashFor(user: OldUser): { password_hash: string } | { password: string } {
  if (user.passwordHash) return { password_hash: user.passwordHash.replace(/^\$2y\$/i, "$2a$") };
  return { password: randomBytes(24).toString("base64url") };
}

async function findUserId(admin: Admin, email: string): Promise<string | null> {
  const { data } = await admin.from("users").select("id").eq("email", email.toLowerCase()).maybeSingle();
  if (data?.id) return data.id as string;
  for (let page = 1; page <= 20; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) return null;
    const hit = listed.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (listed.data.users.length < 200) return null;
  }
  return null;
}

async function rememberProfile(admin: Admin, id: string, user: OldUser) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const patch = { email: user.email, first_name: user.firstName, last_name: user.lastName, name };
  const updated = await admin.from("users").update(patch).eq("id", id).select("id");
  if (updated.data?.length) return;
  await admin.rpc("ensure_user_profile", {
    user_id: id,
    user_email: user.email,
    user_first_name: user.firstName,
    user_last_name: user.lastName,
  });
  await admin.from("users").update(patch).eq("id", id);
}

function stamp(value: string): string {
  if (!value) return new Date().toISOString();
  if (value.endsWith("Z") || value.includes("+")) return value;
  const parsed = Date.parse(value.replace(" ", "T"));
  if (!Number.isFinite(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}

async function hockeySportId(admin: Admin): Promise<string> {
  const hockey = await admin.from("sports").select("id").eq("icon", "hockey").limit(1).maybeSingle();
  if (hockey.data?.id) return hockey.data.id as string;
  const any = await admin.from("sports").select("id").eq("is_active", true).limit(1).maybeSingle();
  if (any.data?.id) return any.data.id as string;
  throw new MoveError("old2new.error.sport");
}

export async function importPingvini(onProgress: (event: ProgressEvent) => void): Promise<void> {
  emit(onProgress, "read", 0, 1, "run");
  const data = await loadPingvini();
  emit(onProgress, "read", 1, 1, "ok");
  const admin = adminClient();
  if (await teamExists(admin, data.inviteCode)) throw new MoveError("old2new.error.exists");
  const users = await writeUsers(admin, data, onProgress);
  const maps = await writeTeam(admin, data, users, onProgress);
  await writeMembers(admin, data, maps, onProgress);
  await writeEvents(admin, data, maps, onProgress);
  await writeRsvps(admin, data, maps, onProgress);
  await writeBalances(admin, data, maps, onProgress);
}

type Maps = {
  teamId: string;
  users: Map<number, string>;
  subteams: Map<number, string>;
  venues: Map<number, string>;
  events: Map<number, string>;
  unknownVenue: string | null;
};

async function writeUsers(admin: Admin, data: PingviniData, onProgress: (event: ProgressEvent) => void) {
  const total = data.users.length;
  emit(onProgress, "users", 0, total, "run");
  const map = new Map<number, string>();
  for (let index = 0; index < data.users.length; index += 1) {
    const user = data.users[index];
    const existing = await findUserId(admin, user.email);
    if (existing) {
      map.set(user.id, existing);
    } else {
      const created = await admin.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: { first_name: user.firstName, last_name: user.lastName },
        ...hashFor(user),
      });
      if (created.error || !created.data.user) {
        const again = await findUserId(admin, user.email);
        if (!again) throw new Error(created.error?.message || "user");
        map.set(user.id, again);
      } else {
        map.set(user.id, created.data.user.id);
        await rememberProfile(admin, created.data.user.id, user);
      }
    }
    emit(onProgress, "users", index + 1, total, "run");
  }
  if (!map.get(data.leaderId)) throw new MoveError("old2new.error.leader");
  emit(onProgress, "users", total, total, "ok");
  return map;
}

async function writeTeam(
  admin: Admin,
  data: PingviniData,
  users: Map<number, string>,
  onProgress: (event: ProgressEvent) => void,
): Promise<Maps> {
  const total = 1 + data.subteams.length + data.venues.length + (data.counts.missingVenue > 0 ? 1 : 0);
  emit(onProgress, "team", 0, total, "run");
  const teamId = crypto.randomUUID();
  const sportId = await hockeySportId(admin);
  const leader = users.get(data.leaderId);
  const inserted = await admin.from("teams").insert({
    id: teamId,
    name: data.teamName.slice(0, 80),
    invite_code: data.inviteCode || null,
    leader_id: leader,
    balance: data.balance,
    training_voting_hours: data.trainingHours,
    game_voting_hours: data.gameHours,
    currency: "EUR",
    sport_id: sportId,
  });
  if (inserted.error) throw new Error(inserted.error.message);
  let done = 1;
  emit(onProgress, "team", done, total, "run");

  const subteams = new Map<number, string>();
  const subteamRows = data.subteams.map((item) => {
    const id = crypto.randomUUID();
    subteams.set(item.id, id);
    return { id, team_id: teamId, name: item.name, color: item.color };
  });
  if (subteamRows.length) {
    const result = await admin.from("subteams").insert(subteamRows);
    if (result.error) throw new Error(result.error.message);
  }
  done += data.subteams.length;
  emit(onProgress, "team", done, total, "run");

  const venues = new Map<number, string>();
  const venueRows = data.venues.map((item) => {
    const id = crypto.randomUUID();
    venues.set(item.id, id);
    return { id, team_id: teamId, name: item.name, price_per_hour: item.price, hidden: item.hidden };
  });
  let unknownVenue: string | null = null;
  if (data.counts.missingVenue > 0) {
    unknownVenue = crypto.randomUUID();
    venueRows.push({ id: unknownVenue, team_id: teamId, name: "Nezināms", price_per_hour: 0, hidden: false });
  }
  if (venueRows.length) {
    const result = await admin.from("venues").insert(venueRows);
    if (result.error) throw new Error(result.error.message);
  }
  done = total;
  emit(onProgress, "team", done, total, "ok");
  return { teamId, users, subteams, venues, events: new Map(), unknownVenue };
}

async function writeMembers(admin: Admin, data: PingviniData, maps: Maps, onProgress: (event: ProgressEvent) => void) {
  const rows = data.members.flatMap((member) => {
    const userId = maps.users.get(member.userId);
    if (!userId) return [];
    return [{
      team_id: maps.teamId,
      user_id: userId,
      jersey_number: member.number,
      position: normalizePositionCode(member.position),
      phone: member.phone,
      joined_on: member.joinedOn,
      fee_exempt: member.feeExempt,
      is_team_admin: member.role === 1,
      extra_positions: "",
    }];
  });
  emit(onProgress, "members", 0, rows.length, "run");
  await inChunks(rows, 100, async (part) => {
    const result = await admin.from("team_members").insert(part);
    if (result.error) throw new Error(result.error.message);
  }, (done) => emit(onProgress, "members", done, rows.length, "run"));

  const linkRows: { team_id: string; user_id: string; subteam_id: string }[] = [];
  const memberIds = new Map(data.members.map((member) => [member.id, member.userId]));
  const seenLinks = new Set<string>();
  for (const link of data.links) {
    const oldUser = memberIds.get(link.memberId);
    const userId = oldUser ? maps.users.get(oldUser) : undefined;
    const subteamId = maps.subteams.get(link.subteamId);
    if (!userId || !subteamId) continue;
    const key = `${userId}:${subteamId}`;
    if (seenLinks.has(key)) continue;
    seenLinks.add(key);
    linkRows.push({ team_id: maps.teamId, user_id: userId, subteam_id: subteamId });
  }
  if (linkRows.length) {
    const result = await admin.from("team_member_subteams").insert(linkRows);
    if (result.error) throw new Error(result.error.message);
  }
  emit(onProgress, "members", rows.length, rows.length, "ok");
}

async function writeEvents(admin: Admin, data: PingviniData, maps: Maps, onProgress: (event: ProgressEvent) => void) {
  const settledAt = new Date().toISOString();
  const rows = data.events.flatMap((event) => {
    const venueId = (event.venueId != null ? maps.venues.get(event.venueId) : null) ?? maps.unknownVenue;
    if (!venueId) return [];
    const id = crypto.randomUUID();
    maps.events.set(event.id, id);
    const slots: Record<string, string> = {};
    for (const [slot, oldUser] of event.slots) {
      const userId = maps.users.get(oldUser);
      if (userId) slots[String(slot)] = userId;
    }
    const sides: Record<string, "black" | "white"> = {};
    for (const [oldUser, side] of event.sides) {
      const userId = maps.users.get(oldUser);
      if (userId) sides[userId] = side;
    }
    const lineup = Object.keys(slots).length || Object.keys(sides).length ? { slots, sides } : {};
    return [{
      id,
      team_id: maps.teamId,
      event_date: event.date,
      start_time: event.start,
      event_type: event.type,
      venue_id: venueId,
      subteam_id: event.subteamId != null ? maps.subteams.get(event.subteamId) ?? null : null,
      expense: event.expense,
      with_coach: event.type === "game" ? false : event.withCoach,
      settled_at: settledAt,
      lineup,
      created_at: stamp(event.createdAt),
    }];
  });
  emit(onProgress, "events", 0, rows.length, "run");
  await inChunks(rows, 40, async (part) => {
    const result = await admin.from("team_events").insert(part);
    if (result.error) throw new Error(result.error.message);
  }, (done) => emit(onProgress, "events", done, rows.length, "run"));
  emit(onProgress, "events", rows.length, rows.length, "ok");
}

async function writeRsvps(admin: Admin, data: PingviniData, maps: Maps, onProgress: (event: ProgressEvent) => void) {
  const rows = data.rsvps.flatMap((rsvp) => {
    const eventId = maps.events.get(rsvp.eventId);
    const userId = maps.users.get(rsvp.userId);
    if (!eventId || !userId) return [];
    return [{
      event_id: eventId,
      team_id: maps.teamId,
      user_id: userId,
      status: rsvp.status,
      updated_at: stamp(rsvp.updatedAt),
    }];
  });
  emit(onProgress, "rsvp", 0, rows.length, "run");
  await inChunks(rows, 200, async (part) => {
    const result = await admin.from("team_event_rsvps").insert(part);
    if (result.error) throw new Error(result.error.message);
  }, (done) => emit(onProgress, "rsvp", done, rows.length, "run"));
  emit(onProgress, "rsvp", rows.length, rows.length, "ok");
}

async function writeBalances(admin: Admin, data: PingviniData, maps: Maps, onProgress: (event: ProgressEvent) => void) {
  const leader = maps.users.get(data.leaderId) ?? null;
  const entries = data.balances.flatMap((piece) => {
    const userId = maps.users.get(piece.userId);
    if (!userId || piece.amount === 0) return [];
    const changedBy = piece.changedBy != null ? maps.users.get(piece.changedBy) ?? leader : leader;
    return [{
      team_id: maps.teamId,
      user_id: userId,
      amount: piece.amount,
      kind: "manual",
      created_at: stamp(piece.createdAt),
      created_by: changedBy,
    }];
  });
  const ledger = data.events.flatMap((event) => {
    const eventId = maps.events.get(event.id);
    if (!eventId || event.expense == null || event.expense === 0) return [];
    return [{
      team_id: maps.teamId,
      event_id: eventId,
      amount: -event.expense,
      event_date: event.date,
      event_type: event.type,
      created_at: stamp(event.createdAt),
    }];
  });
  const total = entries.length + ledger.length;
  emit(onProgress, "balances", 0, total, "run");
  let done = 0;
  await inChunks(entries, 200, async (part) => {
    const result = await admin.from("balance_entries").insert(part);
    if (result.error) throw new Error(result.error.message);
  }, (count) => {
    done = count;
    emit(onProgress, "balances", done, total, "run");
  });
  await inChunks(ledger, 200, async (part) => {
    const result = await admin.from("team_ledger").insert(part);
    if (result.error) throw new Error(result.error.message);
  }, (count) => emit(onProgress, "balances", entries.length + count, total, "run"));
  emit(onProgress, "balances", total, total, "ok");
}

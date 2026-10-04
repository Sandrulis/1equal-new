import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import type { ScanCounts } from "@/app/lib/old-2-new/types";

type Cell = string | number | null;
type Row = Record<string, Cell>;

const WANTED = new Set([
  "users",
  "users_teams",
  "users_teams_events",
  "users_teams_events_members",
  "users_teams_members",
  "users_teams_members_balance_log",
  "users_teams_members_sub_teams",
  "users_teams_sub_teams",
  "users_teams_venue",
  "users_teams_invoices",
  "users_teams_expenses",
]);

const COUNT_ONLY = new Set(["users_teams_invoices", "users_teams_expenses"]);

export class MoveError extends Error {
  constructor(key: string) {
    super(key);
    this.name = "MoveError";
  }
}

export function dumpFilePath(): string {
  const fromEnv = process.env.OLD_SQL_PATH?.trim();
  if (fromEnv) return fromEnv;
  return path.resolve(process.cwd(), "../1equal-old/equalcom_1equal_20261004.sql");
}

function foldTeam(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function num(value: Cell | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function text(value: Cell | undefined): string {
  if (value == null) return "";
  return String(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseMysqlTuple(input: string): Cell[] | null {
  let i = 0;
  while (i < input.length && input[i] !== "(") i += 1;
  if (input[i] !== "(") return null;
  i += 1;
  const cells: Cell[] = [];
  while (i < input.length) {
    while (input[i] === " " || input[i] === "\t" || input[i] === "\n" || input[i] === "\r") i += 1;
    if (input[i] === ")" || input[i] == null) break;
    if (input.startsWith("NULL", i) && !/[A-Za-z0-9_]/.test(input[i + 4] ?? "")) {
      cells.push(null);
      i += 4;
    } else if (input[i] === "'") {
      i += 1;
      let value = "";
      while (i < input.length) {
        const char = input[i];
        if (char === "\\") {
          const next = input[i + 1] ?? "";
          if (next === "n") value += "\n";
          else if (next === "r") value += "\r";
          else if (next === "t") value += "\t";
          else if (next === "0") value += "\0";
          else if (next === "Z") value += "\u001a";
          else value += next;
          i += 2;
          continue;
        }
        if (char === "'") {
          if (input[i + 1] === "'") {
            value += "'";
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        value += char;
        i += 1;
      }
      cells.push(value);
    } else {
      let end = i;
      while (end < input.length && input[end] !== "," && input[end] !== ")") end += 1;
      const raw = input.slice(i, end).trim();
      const parsed = Number(raw);
      cells.push(raw !== "" && Number.isFinite(parsed) ? parsed : raw);
      i = end;
    }
    while (input[i] === " " || input[i] === "\n" || input[i] === "\r" || input[i] === "\t") i += 1;
    if (input[i] === ",") i += 1;
  }
  return cells;
}

function tupleComplete(input: string): boolean {
  let depth = 0;
  let quote = false;
  let seen = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quote) {
      if (char === "\\") {
        i += 1;
        continue;
      }
      if (char === "'") {
        if (input[i + 1] === "'") {
          i += 1;
          continue;
        }
        quote = false;
      }
      continue;
    }
    if (char === "'") {
      quote = true;
      continue;
    }
    if (char === "(") {
      depth += 1;
      seen = true;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (seen && depth === 0) return true;
    }
  }
  return false;
}

function parseInsertHeader(line: string): { table: string; columns: string[]; rest: string } | null {
  const match = /^INSERT INTO `([A-Za-z0-9_]+)` \((.*)\) VALUES(.*)$/.exec(line.trim());
  if (!match) return null;
  const columns = match[2].split(",").map((part) => part.trim().replace(/^`|`$/g, ""));
  return { table: match[1], columns, rest: match[3].trim() };
}

function asRow(columns: string[], cells: Cell[]): Row {
  const row: Row = {};
  columns.forEach((column, index) => {
    row[column] = cells[index] ?? null;
  });
  return row;
}

async function readDump(file: string): Promise<{ tables: Map<string, Row[]>; teamIds: Map<string, number[]> }> {
  try {
    await access(file);
  } catch {
    throw new MoveError("old2new.error.file");
  }
  const tables = new Map<string, Row[]>();
  const teamIds = new Map<string, number[]>();
  for (const name of WANTED) {
    if (COUNT_ONLY.has(name)) teamIds.set(name, []);
    else tables.set(name, []);
  }

  let table = "";
  let columns: string[] = [];
  let pending = "";

  const save = () => {
    const cells = parseMysqlTuple(pending);
    pending = "";
    if (!cells) return;
    if (COUNT_ONLY.has(table)) {
      const row = asRow(columns, cells);
      const teamId = num(row.team_id);
      if (teamId != null) teamIds.get(table)?.push(teamId);
      return;
    }
    tables.get(table)?.push(asRow(columns, cells));
  };

  const stream = createReadStream(file, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!pending && line.startsWith("INSERT INTO `")) {
      const header = parseInsertHeader(line);
      if (!header || !WANTED.has(header.table)) {
        table = "";
        continue;
      }
      table = header.table;
      columns = header.columns;
      if (header.rest.startsWith("(")) pending = header.rest;
      if (pending && tupleComplete(pending)) {
        const ended = pending.trim().endsWith(";");
        save();
        if (ended) table = "";
      }
      continue;
    }
    if (!table) continue;
    if (!pending) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("(")) continue;
      pending = trimmed;
    } else {
      pending += `\n${line}`;
    }
    if (pending.length > 5_000_000) {
      pending = "";
      continue;
    }
    if (tupleComplete(pending)) {
      const ended = pending.trim().endsWith(";");
      save();
      if (ended) table = "";
    }
  }
  return { tables, teamIds };
}

export type OldUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string | null;
};

export type OldMember = {
  id: number;
  userId: number;
  role: number;
  number: number | null;
  clearedNumber: number | null;
  position: string;
  balance: number;
  feeExempt: boolean;
  hidden: boolean;
  phone: string;
  joinedOn: string;
};

export type OldEvent = {
  id: number;
  subteamId: number | null;
  type: "game" | "training";
  venueId: number | null;
  expense: number | null;
  expenseWasEmpty: boolean;
  date: string;
  start: string;
  createdAt: string;
  withCoach: boolean;
  hidden: boolean;
  slots: [number, number][];
  sides: [number, "black" | "white"][];
};

export type OldRsvp = {
  eventId: number;
  userId: number;
  status: "going" | "absent";
  updatedAt: string;
};

export type BalancePiece = {
  userId: number;
  amount: number;
  createdAt: string;
  changedBy: number | null;
};

export type PingviniData = {
  teamName: string;
  inviteCode: string;
  balance: number;
  leaderId: number;
  trainingHours: number;
  gameHours: number;
  users: OldUser[];
  members: OldMember[];
  subteams: { id: number; name: string; color: string }[];
  venues: { id: number; name: string; price: number; hidden: boolean }[];
  events: OldEvent[];
  rsvps: OldRsvp[];
  balances: BalancePiece[];
  links: { memberId: number; subteamId: number }[];
  counts: ScanCounts;
};

const SLOT_ORDER = ["LW", "C", "RW", "LD", "RD"];

function slotId(key: string): number | null {
  if (key === "G" || key === "G1" || key === "GK") return 16;
  const match = /^(LW|C|RW|LD|RD)([123])$/.exec(key);
  if (!match) return null;
  const index = SLOT_ORDER.indexOf(match[1]);
  const shift = Number(match[2]);
  return (shift - 1) * SLOT_ORDER.length + index + 1;
}

function userFromSlot(value: unknown, memberUser: Map<number, number>): number | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { memberId?: unknown; id?: unknown };
  const memberId = Number(row.memberId);
  if (Number.isInteger(memberId) && memberUser.has(memberId)) return memberUser.get(memberId) ?? null;
  const userId = Number(row.id);
  return Number.isInteger(userId) ? userId : null;
}

function readLayout(
  raw: string,
  type: string,
  memberUser: Map<number, number>,
): { slots: [number, number][]; sides: [number, "black" | "white"][]; broken: boolean } {
  if (!raw.trim()) return { slots: [], sides: [], broken: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { slots: [], sides: [], broken: true };
  }
  if (!parsed || typeof parsed !== "object") return { slots: [], sides: [], broken: true };
  const body = parsed as Record<string, unknown>;
  if (type === "training" && (body.blackTeam || body.whiteTeam || body.centerSection)) {
    const sides: [number, "black" | "white"][] = [];
    const take = (list: unknown, side: "black" | "white") => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const userId = Number((item as { user_id?: unknown }).user_id);
        if (Number.isInteger(userId)) sides.push([userId, side]);
      }
    };
    take(body.blackTeam, "black");
    take(body.whiteTeam, "white");
    return { slots: [], sides, broken: false };
  }
  const slots: [number, number][] = [];
  for (const [key, value] of Object.entries(body)) {
    const slot = slotId(key);
    const userId = userFromSlot(value, memberUser);
    if (slot != null && userId != null) slots.push([slot, userId]);
  }
  return { slots, sides: [], broken: false };
}

function earlier(left: string, right: string): string {
  const stamp = Date.parse(left.replace(" ", "T"));
  if (!Number.isFinite(stamp)) return left || right;
  return new Date(stamp - 1000).toISOString();
}

function hours(value: Cell | undefined, fallback: number): number {
  const parsed = Math.round(num(value) ?? fallback);
  if (parsed < 1 || parsed > 168) return fallback;
  return parsed;
}

export async function loadPingvini(): Promise<PingviniData> {
  const { tables, teamIds } = await readDump(dumpFilePath());
  const teams = tables.get("users_teams") ?? [];
  const pingvini = teams.filter((row) => foldTeam(text(row.name)) === "pingvini");
  const team = pingvini.find((row) => text(row.name) === "Pingvīni") ?? pingvini[0];
  if (!team) throw new MoveError("old2new.error.team");
  const teamId = num(team.id);
  if (teamId == null) throw new MoveError("old2new.error.team");

  const memberRows = (tables.get("users_teams_members") ?? []).filter((row) => num(row.team_id) === teamId);
  const memberUser = new Map<number, number>();
  const seenUsers = new Set<number>();
  const members: OldMember[] = [];
  let hiddenMembers = 0;
  let kids = 0;
  let parents = 0;
  let addresses = 0;
  let jerseyCleared = 0;
  let defenseFolded = 0;
  for (const row of memberRows) {
    const id = num(row.id);
    const userId = num(row.user_id);
    if (id == null || userId == null || seenUsers.has(userId)) continue;
    seenUsers.add(userId);
    memberUser.set(id, userId);
    if (num(row.hidden) === 1) hiddenMembers += 1;
    if (num(row.is_kid) === 1) kids += 1;
    if (text(row.parent_phone).trim() || text(row.parents_name_surname).trim()) parents += 1;
    if (text(row.address).trim()) addresses += 1;
    const jersey = num(row.number);
    const jerseyOk = jersey != null && Number.isInteger(jersey) && jersey >= 0 && jersey <= 99;
    if (jersey != null && !jerseyOk) jerseyCleared += 1;
    const position = text(row.position).trim();
    if (/^(LD|RD)$/i.test(position)) defenseFolded += 1;
    const created = text(row.created_at);
    members.push({
      id,
      userId,
      role: num(row.role) ?? 0,
      number: jerseyOk ? jersey : null,
      clearedNumber: jersey != null && !jerseyOk ? jersey : null,
      position,
      hidden: num(row.hidden) === 1,
      balance: round2(num(row.balance) ?? 0),
      feeExempt: num(row.dont_charge) === 1,
      phone: "",
      joinedOn: /^\d{4}-\d{2}-\d{2}/.test(created) ? created.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
  }

  const eventRows = (tables.get("users_teams_events") ?? []).filter((row) => num(row.team_id) === teamId);
  const eventIds = new Set<number>();
  const events: OldEvent[] = [];
  let hiddenEvents = 0;
  let meetings = 0;
  let gamesWithoutExpense = 0;
  let missingVenue = 0;
  let brokenLineups = 0;
  for (const row of eventRows) {
    const id = num(row.id);
    if (id == null) continue;
    const rawType = text(row.type);
    if (rawType === "meeting") meetings += 1;
    const type = rawType === "game" ? "game" : "training";
    const date = text(row.event_date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    let start = text(row.start_time).slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(start)) start = "00:00";
    const venueId = num(row.venue_id);
    if (venueId == null) missingVenue += 1;
    if (num(row.hidden) === 1) hiddenEvents += 1;
    const expense = num(row.expense);
    const expenseWasEmpty = type === "game" && expense == null;
    let storedExpense: number | null = expense == null ? null : round2(expense);
    if (type === "game" && (storedExpense == null || storedExpense < 0)) {
      if (storedExpense == null) gamesWithoutExpense += 1;
      storedExpense = 0;
    }
    if (storedExpense != null && (storedExpense < 0 || storedExpense > 1_000_000)) storedExpense = type === "game" ? 0 : null;
    const layout = readLayout(text(row.game_layout_positions), rawType, memberUser);
    if (layout.broken) brokenLineups += 1;
    eventIds.add(id);
    events.push({
      id,
      subteamId: num(row.sub_team_id),
      type,
      venueId,
      expense: storedExpense,
      expenseWasEmpty,
      date,
      start,
      createdAt: text(row.created_at),
      withCoach: type === "training" && num(row.without_trainer) !== 1,
      hidden: num(row.hidden) === 1,
      slots: layout.slots,
      sides: layout.sides,
    });
  }

  const rsvpRows = (tables.get("users_teams_events_members") ?? []).filter((row) => {
    const eventId = num(row.event_id);
    return eventId != null && eventIds.has(eventId);
  });
  const rsvpByKey = new Map<string, OldRsvp>();
  let waitingRsvp = 0;
  for (const row of rsvpRows) {
    const eventId = num(row.event_id);
    const userId = num(row.user_id);
    const status = num(row.going_status);
    if (eventId == null || userId == null) continue;
    if (status !== 0 && status !== 1) {
      waitingRsvp += 1;
      continue;
    }
    const next: OldRsvp = {
      eventId,
      userId,
      status: status === 1 ? "going" : "absent",
      updatedAt: text(row.updated_at) || text(row.created_at),
    };
    const key = `${eventId}:${userId}`;
    const current = rsvpByKey.get(key);
    if (!current || next.updatedAt >= current.updatedAt) rsvpByKey.set(key, next);
  }

  const leaderId = num(team.user_id) ?? members.find((member) => member.role === 1)?.userId ?? 0;
  const neededUsers = new Set<number>(members.map((member) => member.userId));
  if (leaderId) neededUsers.add(leaderId);
  for (const rsvp of rsvpByKey.values()) neededUsers.add(rsvp.userId);

  const users: OldUser[] = [];
  const seenEmail = new Set<string>();
  let noPassword = 0;
  for (const row of tables.get("users") ?? []) {
    const id = num(row.id);
    if (id == null || !neededUsers.has(id)) continue;
    const email = text(row.email).trim();
    const key = email.toLowerCase();
    if (!email.includes("@") || email.includes(" ") || seenEmail.has(key)) continue;
    seenEmail.add(key);
    const hash = text(row.password);
    const passwordHash = hash.startsWith("$2") ? hash : null;
    if (!passwordHash) noPassword += 1;
    const phone = text(row.phone).trim().slice(0, 40);
    users.push({
      id,
      firstName: text(row.name).trim(),
      lastName: text(row.surname).trim(),
      email: key,
      phone,
      passwordHash,
    });
  }
  const userPhone = new Map(users.map((user) => [user.id, user.phone]));
  for (const member of members) member.phone = userPhone.get(member.userId) ?? "";
  const guestUsers = users.filter((user) => !seenUsers.has(user.id)).length;
  const kept = new Set(users.map((user) => user.id));

  const subteams = (tables.get("users_teams_sub_teams") ?? [])
    .filter((row) => num(row.team_id) === teamId)
    .flatMap((row) => {
      const id = num(row.id);
      const name = text(row.name).trim();
      if (id == null || !name) return [];
      const color = text(row.color).trim();
      return [{ id, name: name.slice(0, 80), color: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#0f6e82" }];
    });
  const subteamIds = new Set(subteams.map((item) => item.id));
  for (const event of events) {
    if (event.subteamId != null && !subteamIds.has(event.subteamId)) event.subteamId = null;
  }
  const links = (tables.get("users_teams_members_sub_teams") ?? []).flatMap((row) => {
    const memberId = num(row.member_id);
    const subteamId = num(row.sub_team_id);
    if (memberId == null || subteamId == null || !subteamIds.has(subteamId)) return [];
    const userId = memberUser.get(memberId);
    if (userId == null || !kept.has(userId)) return [];
    return [{ memberId, subteamId }];
  });

  const venues = (tables.get("users_teams_venue") ?? [])
    .filter((row) => num(row.team_id) === teamId)
    .flatMap((row) => {
      const id = num(row.id);
      const name = text(row.name).trim();
      if (id == null || !name) return [];
      const price = round2(num(row.price) ?? 0);
      return [{
        id,
        name: name.slice(0, 80),
        price: Math.min(1_000_000, Math.max(0, price)),
        hidden: num(row.hidden) === 1,
      }];
    });
  const venueIds = new Set(venues.map((item) => item.id));
  for (const event of events) {
    if (event.venueId != null && !venueIds.has(event.venueId)) {
      event.venueId = null;
      missingVenue += 1;
    }
  }

  const logs = (tables.get("users_teams_members_balance_log") ?? []).filter((row) => num(row.team_id) === teamId);
  const history = new Map<number, { amount: number; createdAt: string; changedBy: number }[]>();
  for (const row of logs) {
    const userId = num(row.user_id);
    const amount = round2(num(row.amount) ?? 0);
    if (userId == null || !seenUsers.has(userId) || amount === 0) continue;
    const list = history.get(userId) ?? [];
    list.push({
      amount,
      createdAt: text(row.created_at),
      changedBy: num(row.changed_by) ?? userId,
    });
    history.set(userId, list);
  }
  const balances: BalancePiece[] = [];
  let balanceAdjustments = 0;
  for (const member of members) {
    const rows = history.get(member.userId) ?? [];
    const sum = round2(rows.reduce((total, row) => total + row.amount, 0));
    const diff = round2(member.balance - sum);
    if (diff !== 0) {
      balanceAdjustments += 1;
      balances.push({
        userId: member.userId,
        amount: diff,
        createdAt: earlier(rows[0]?.createdAt || `${member.joinedOn} 00:00:00`, member.joinedOn),
        changedBy: null,
      });
    }
    for (const row of rows) {
      balances.push({ userId: member.userId, amount: row.amount, createdAt: row.createdAt, changedBy: row.changedBy });
    }
  }

  const counts: ScanCounts = {
    users: users.length,
    existingUsers: 0,
    noPassword,
    members: members.filter((member) => kept.has(member.userId)).length,
    hiddenMembers,
    kids,
    parents,
    addresses,
    jerseyCleared,
    defenseFolded,
    subteams: subteams.length,
    venues: venues.length,
    events: events.length,
    hiddenEvents,
    meetings,
    gamesWithoutExpense,
    missingVenue,
    rsvp: [...rsvpByKey.values()].filter((row) => kept.has(row.userId)).length,
    waitingRsvp,
    guestUsers,
    balanceAdjustments,
    invoices: (teamIds.get("users_teams_invoices") ?? []).filter((id) => id === teamId).length,
    otherTeams: teams.length - pingvini.length,
    brokenLineups,
  };

  return {
    teamName: text(team.name),
    inviteCode: text(team.security_code).trim(),
    balance: round2(num(team.balance) ?? 0),
    leaderId,
    trainingHours: hours(team.training_voting_hours, 24),
    gameHours: hours(team.game_voting_hours, 72),
    users: users.filter((user) => kept.has(user.id)),
    members: members.filter((member) => kept.has(member.userId)),
    subteams,
    venues,
    events,
    rsvps: [...rsvpByKey.values()].filter((row) => kept.has(row.userId)),
    balances,
    links,
    counts,
  };
}

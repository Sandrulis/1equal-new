import type { EhlPlayerProfile } from "@/app/lib/ehl-player";
import { CURRENT_USER_ID, TEAM_NAME } from "@/app/lib/demo-constants";
import { DEMO_EHL } from "@/app/lib/demo-ehl";
import { formatJersey } from "@/app/lib/format-jersey";
import { isoDate } from "@/app/lib/format";

export { CURRENT_USER_ID, TEAM_NAME };
export { formatJersey };

export type EventType = "game" | "training";

export type Venue = {
  id: string;
  name: string;
  area: string;
  pricePerHour: number;
  updatedAt: string;
  hidden?: boolean;
};

export type Subteam = {
  id: string;
  name: string;
  color: string;
  updatedAt: string;
};

export type Member = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  number: number | null;
  position: string;
  extraPositions?: string[];
  role: "coach" | "captain" | "goalie" | "defender" | "forward";
  subteamId: string;
  subteamIds?: string[];
  feeExempt?: boolean;
  teamAdmin?: boolean;
  balance: number;
  ledger?: BalanceEntry[];
  ledgerLoaded?: boolean;
  joined: string;
  updatedAt: string;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  originIp?: string;
  originCountry?: string;
  ehl?: EhlPlayerProfile | null;
};

export type TeamEvent = {
  id: string;
  date: string;
  start: string;
  end: string;
  type: EventType;
  titleId: string;
  subteamId: string;
  venueId: string;
  expense?: number | null;
  withCoach?: boolean;
  allowGuests?: boolean;
  lineupSlots?: Record<number, string>;
  lineupSides?: Record<string, "black" | "white">;
  lineupLoaded?: boolean;
  settled?: boolean;
};

export const VENUES: Venue[] = [
  { id: "volvo", name: "Volvo ledus halle", area: "Rīga, Skanste", pricePerHour: 85, updatedAt: "2026-09-17T12:25" },
  { id: "daugava", name: "Daugavas ledus halle", area: "Rīga, Ķengarags", pricePerHour: 72, updatedAt: "2026-09-17T12:25" },
  { id: "inbox", name: "Inbox.lv ledus halle", area: "Rīga, Pļavnieki", pricePerHour: 95, updatedAt: "2026-09-17T12:25" },
  { id: "ogre", name: "Ogres ledus halle", area: "Ogre", pricePerHour: 48, updatedAt: "2026-09-17T12:25" },
];

export const SUBTEAMS: Subteam[] = [
  { id: "virsliga", name: "Virslīga", color: "#0f6e82", updatedAt: "2026-09-17T12:25" },
  { id: "rezerve", name: "Rezerve", color: "#102433", updatedAt: "2026-09-17T12:25" },
  { id: "u18", name: "U18", color: "#b4332a", updatedAt: "2026-09-17T12:25" },
];

const ROSTER: Member[] = [
  { id: "m1", name: "Edgars Liepiņš", email: "edgars.liepins@example.com", phone: "+371 26 111 201", number: 30, position: "", role: "coach", subteamId: "virsliga", balance: -120, joined: "2025-08-12", updatedAt: "2026-09-20T18:10" },
  { id: "m2", name: "Kārlis Bērziņš", email: "karlis.berzins@example.com", phone: "+371 26 111 202", number: 91, position: "LW", extraPositions: ["C"], role: "captain", subteamId: "virsliga", balance: -276, joined: "2025-09-02", updatedAt: "2026-09-24T21:05" },
  { id: "m3", name: "Mārtiņš Ozols", email: "martins.ozols@example.com", phone: "+371 26 111 203", number: 31, position: "G", role: "goalie", subteamId: "virsliga", balance: -40, joined: "2025-09-02", updatedAt: "2026-09-18T09:40" },
  { id: "m4", name: "Rihards Kalns", email: "rihards.kalns@example.com", phone: "+371 26 111 204", number: 4, position: "D", role: "defender", subteamId: "virsliga", balance: 15, joined: "2025-09-08", updatedAt: "2026-09-22T14:12" },
  { id: "m5", name: "Andris Priede", email: "andris.priede@example.com", phone: "+371 26 111 205", number: 19, position: "RW", extraPositions: ["LW"], role: "forward", subteamId: "virsliga", balance: -85, joined: "2025-09-15", updatedAt: "2026-09-25T11:20" },
  { id: "m6", name: "Jānis Vītols", email: "janis.vitols@example.com", phone: "+371 26 222 301", number: 8, position: "", role: "coach", subteamId: "rezerve", balance: 0, joined: "2025-08-20", updatedAt: "2026-09-16T16:00" },
  { id: "m7", name: "Toms Eglītis", email: "toms.eglitis@example.com", phone: "+371 26 222 302", number: 12, position: "C", extraPositions: ["LW", "RW"], role: "captain", subteamId: "rezerve", balance: -544, joined: "2025-09-20", updatedAt: "2026-09-23T19:33" },
  { id: "m8", name: "Roberts Krūmiņš", email: "roberts.krumins@example.com", phone: "+371 26 222 303", number: 1, position: "G", role: "goalie", subteamId: "rezerve", balance: -60, joined: "2025-10-01", updatedAt: "2026-09-11T08:15" },
  { id: "m9", name: "Emīls Saulītis", email: "emils.saulitis@example.com", phone: "+371 26 222 304", number: 5, position: "D", role: "defender", subteamId: "rezerve", balance: -18, joined: "2025-10-04", updatedAt: "2026-09-19T12:48" },
  { id: "m10", name: "Laura Mežale", email: "laura.mezale@example.com", phone: "+371 26 333 401", number: 21, position: "", role: "coach", subteamId: "u18", balance: 25, joined: "2025-09-01", updatedAt: "2026-09-21T17:05" },
  { id: "m11", name: "Gustavs Reinis", email: "gustavs.reinis@example.com", phone: "+371 26 333 402", number: 17, position: "LW", role: "captain", subteamId: "u18", balance: -32, joined: "2025-09-18", updatedAt: "2026-09-25T07:55" },
  { id: "m12", name: "Elīna Kalna", email: "elina.kalna@example.com", phone: "+371 26 333 403", number: 11, position: "C", role: "forward", subteamId: "u18", balance: -96, joined: "2025-09-28", updatedAt: "2026-09-14T20:22" },
];

export const MEMBERS: Member[] = ROSTER.map((member) => {
  const ehl = DEMO_EHL[member.id];
  if (!ehl) return member;
  return { ...member, photoUrl: ehl.photoUrl, ehl };
});

const GAME_TITLES = ["vs-riga", "vs-jelgava", "vs-ogre", "vs-liepaja", "vs-tukums", "vs-kurbads", "vs-mogo"] as const;
const TRAIN_TITLES = ["ice", "skills", "situations", "pregame"] as const;

const MONTH_SLOTS: { type: EventType; start: string; end: string; subteamId: string; venueId: string }[] = [
  { type: "training", start: "20:00", end: "21:30", subteamId: "virsliga", venueId: "volvo" },
  { type: "training", start: "19:30", end: "21:00", subteamId: "rezerve", venueId: "daugava" },
  { type: "game", start: "18:00", end: "20:00", subteamId: "virsliga", venueId: "inbox" },
  { type: "training", start: "17:30", end: "19:00", subteamId: "u18", venueId: "ogre" },
  { type: "training", start: "20:00", end: "21:30", subteamId: "virsliga", venueId: "volvo" },
  { type: "game", start: "16:00", end: "17:30", subteamId: "rezerve", venueId: "daugava" },
  { type: "training", start: "20:00", end: "21:30", subteamId: "virsliga", venueId: "inbox" },
  { type: "game", start: "19:00", end: "21:00", subteamId: "virsliga", venueId: "volvo" },
];

function monthSeed(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function monthDays(year: number, monthIndex: number, count: number): number[] {
  const random = monthSeed(year * 100 + monthIndex + 1);
  const days = Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => index + 1);
  for (let index = days.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = days[index];
    days[index] = days[swap];
    days[swap] = current;
  }
  return days.slice(0, count).sort((left, right) => left - right);
}

function eventsForMonth(year: number, monthIndex: number): TeamEvent[] {
  const days = monthDays(year, monthIndex, MONTH_SLOTS.length);
  const month = String(monthIndex + 1).padStart(2, "0");
  return MONTH_SLOTS.map((slot, index) => {
    const titles = slot.type === "game" ? GAME_TITLES : TRAIN_TITLES;
    return {
      id: `demo-${year}${month}-${index + 1}`,
      date: `${year}-${month}-${String(days[index]).padStart(2, "0")}`,
      titleId: titles[(year + monthIndex + index) % titles.length],
      ...slot,
    };
  });
}

function rollingEvents(now: Date): TeamEvent[] {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const events: TeamEvent[] = [];
  for (let offset = 0; offset < 4; offset += 1) {
    const cursor = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    events.push(...eventsForMonth(cursor.getFullYear(), cursor.getMonth()));
  }
  return events;
}

const CHARGE_AMOUNT: Record<string, number> = { volvo: 40, daugava: 36, inbox: 45, ogre: 24 };

function rollingCharges(events: TeamEvent[], now: Date): PlayerCharge[] {
  const today = isoDate(now);
  const recent = events.filter((event) => event.date < today).slice(-16);
  const charges: PlayerCharge[] = [];
  for (const event of recent) {
    const members = ROSTER.filter((member) => member.subteamId === event.subteamId).filter((_, index) => index % 2 === 0).slice(0, 3);
    for (const member of members) {
      charges.push({
        id: `c-${event.id}-${member.id}`,
        memberId: member.id,
        date: event.date,
        time: event.start,
        amount: -(CHARGE_AMOUNT[event.venueId] ?? 30),
        kind: "event",
        type: event.type,
        titleId: event.titleId,
        venueId: event.venueId,
      });
    }
  }
  const paidOn = recent.at(-1)?.date ?? today;
  charges.push(
    { id: "pay-m4", memberId: "m4", date: paidOn, time: "14:12", amount: 100, kind: "payment" },
    { id: "pay-m6", memberId: "m6", date: paidOn, time: "16:00", amount: 108, kind: "payment" },
    { id: "pay-m10", memberId: "m10", date: paidOn, time: "17:05", amount: 121, kind: "payment" },
  );
  return charges;
}

let catalogCache: { key: string; events: TeamEvent[]; charges: PlayerCharge[] } | null = null;

function catalog(now = new Date()) {
  const key = `${now.getFullYear()}-${now.getMonth()}`;
  if (catalogCache?.key === key) return catalogCache;
  const events = rollingEvents(now);
  catalogCache = { key, events, charges: rollingCharges(events, now) };
  return catalogCache;
}

export function catalogEvents(now = new Date()): TeamEvent[] {
  return catalog(now).events;
}

export type BalanceEntry = {
  id: string;
  amount: number;
  at: string;
  kind?: "manual" | "event";
  eventId?: string | null;
  eventDate?: string | null;
  eventStart?: string | null;
  eventType?: EventType | null;
  venueName?: string | null;
};

export type PlayerCharge = {
  id: string;
  memberId: string;
  date: string;
  time: string;
  amount: number;
  kind: "event" | "payment" | "manual";
  type?: EventType;
  titleId?: string;
  venueId?: string;
  venueName?: string;
  recordedAt?: string;
};

export function chargesForMember(memberId: string): PlayerCharge[] {
  return catalog().charges.filter((charge) => charge.memberId === memberId).sort(
    (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
  );
}

export function venueById(id: string): Venue {
  const venue = VENUES.find((item) => item.id === id);
  if (!venue) throw new Error(`Unknown venue ${id}`);
  return venue;
}

export function subteamById(id: string): Subteam {
  const subteam = SUBTEAMS.find((item) => item.id === id);
  if (!subteam) throw new Error(`Unknown subteam ${id}`);
  return subteam;
}

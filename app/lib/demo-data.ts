import type { EhlPlayerProfile } from "@/app/lib/ehl-player";

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
  email: string;
  phone: string;
  number: number | null;
  position: string;
  role: "coach" | "captain" | "goalie" | "defender" | "forward";
  subteamId: string;
  subteamIds?: string[];
  feeExempt?: boolean;
  balance: number;
  ledger?: BalanceEntry[];
  joined: string;
  updatedAt: string;
  photoUrl?: string | null;
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
};

export function formatJersey(number: number | null | undefined): string | null {
  if (number == null || !Number.isInteger(number) || number < 0 || number > 99) return null;
  return `#${number}`;
}

export const TEAM_NAME = "HK Rīga Amateiri";
export const CURRENT_USER_ID = "m1";

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

export const MEMBERS: Member[] = [
  { id: "m1", name: "Edgars Liepiņš", email: "edgars.liepins@example.com", phone: "+371 26 111 201", number: 30, position: "TR", role: "coach", subteamId: "virsliga", balance: -120, joined: "2025-08-12", updatedAt: "2026-09-20T18:10" },
  { id: "m2", name: "Kārlis Bērziņš", email: "karlis.berzins@example.com", phone: "+371 26 111 202", number: 91, position: "LW", role: "captain", subteamId: "virsliga", balance: -276, joined: "2025-09-02", updatedAt: "2026-09-24T21:05" },
  { id: "m3", name: "Mārtiņš Ozols", email: "martins.ozols@example.com", phone: "+371 26 111 203", number: 31, position: "G", role: "goalie", subteamId: "virsliga", balance: -40, joined: "2025-09-02", updatedAt: "2026-09-18T09:40" },
  { id: "m4", name: "Rihards Kalns", email: "rihards.kalns@example.com", phone: "+371 26 111 204", number: 4, position: "LD", role: "defender", subteamId: "virsliga", balance: 15, joined: "2025-09-08", updatedAt: "2026-09-22T14:12" },
  { id: "m5", name: "Andris Priede", email: "andris.priede@example.com", phone: "+371 26 111 205", number: 19, position: "RW", role: "forward", subteamId: "virsliga", balance: -85, joined: "2025-09-15", updatedAt: "2026-09-25T11:20" },
  { id: "m6", name: "Jānis Vītols", email: "janis.vitols@example.com", phone: "+371 26 222 301", number: 8, position: "TR", role: "coach", subteamId: "rezerve", balance: 0, joined: "2025-08-20", updatedAt: "2026-09-16T16:00" },
  { id: "m7", name: "Toms Eglītis", email: "toms.eglitis@example.com", phone: "+371 26 222 302", number: 12, position: "C", role: "captain", subteamId: "rezerve", balance: -544, joined: "2025-09-20", updatedAt: "2026-09-23T19:33" },
  { id: "m8", name: "Roberts Krūmiņš", email: "roberts.krumins@example.com", phone: "+371 26 222 303", number: 1, position: "G", role: "goalie", subteamId: "rezerve", balance: -60, joined: "2025-10-01", updatedAt: "2026-09-11T08:15" },
  { id: "m9", name: "Emīls Saulītis", email: "emils.saulitis@example.com", phone: "+371 26 222 304", number: 5, position: "RD", role: "defender", subteamId: "rezerve", balance: -18, joined: "2025-10-04", updatedAt: "2026-09-19T12:48" },
  { id: "m10", name: "Laura Mežale", email: "laura.mezale@example.com", phone: "+371 26 333 401", number: 21, position: "TR", role: "coach", subteamId: "u18", balance: 25, joined: "2025-09-01", updatedAt: "2026-09-21T17:05" },
  { id: "m11", name: "Gustavs Reinis", email: "gustavs.reinis@example.com", phone: "+371 26 333 402", number: 17, position: "LW", role: "captain", subteamId: "u18", balance: -32, joined: "2025-09-18", updatedAt: "2026-09-25T07:55" },
  { id: "m12", name: "Elīna Kalna", email: "elina.kalna@example.com", phone: "+371 26 333 403", number: 11, position: "C", role: "forward", subteamId: "u18", balance: -96, joined: "2025-09-28", updatedAt: "2026-09-14T20:22" },
];

export const EVENTS: TeamEvent[] = [
  { id: "e1", date: "2026-08-27", start: "20:00", end: "21:30", type: "training", titleId: "ice", subteamId: "virsliga", venueId: "volvo" },
  { id: "e2", date: "2026-08-29", start: "18:00", end: "20:00", type: "game", titleId: "vs-riga", subteamId: "virsliga", venueId: "daugava" },
  { id: "e3", date: "2026-09-01", start: "20:00", end: "21:30", type: "training", titleId: "ice", subteamId: "virsliga", venueId: "volvo" },
  { id: "e4", date: "2026-09-03", start: "19:30", end: "21:00", type: "training", titleId: "ice", subteamId: "rezerve", venueId: "daugava" },
  { id: "e5", date: "2026-09-05", start: "18:00", end: "20:00", type: "game", titleId: "vs-jelgava", subteamId: "virsliga", venueId: "inbox" },
  { id: "e6", date: "2026-09-08", start: "17:30", end: "19:00", type: "training", titleId: "skills", subteamId: "u18", venueId: "ogre" },
  { id: "e7", date: "2026-09-10", start: "20:00", end: "21:30", type: "training", titleId: "ice", subteamId: "virsliga", venueId: "volvo" },
  { id: "e8", date: "2026-09-12", start: "16:00", end: "17:30", type: "game", titleId: "vs-ogre", subteamId: "rezerve", venueId: "daugava" },
  { id: "e9", date: "2026-09-15", start: "20:00", end: "21:30", type: "training", titleId: "situations", subteamId: "virsliga", venueId: "inbox" },
  { id: "e10", date: "2026-09-17", start: "17:30", end: "19:00", type: "training", titleId: "ice", subteamId: "u18", venueId: "ogre" },
  { id: "e11", date: "2026-09-19", start: "19:00", end: "21:00", type: "game", titleId: "vs-liepaja", subteamId: "virsliga", venueId: "volvo" },
  { id: "e12", date: "2026-09-22", start: "19:30", end: "21:00", type: "training", titleId: "ice", subteamId: "rezerve", venueId: "daugava" },
  { id: "e13", date: "2026-09-24", start: "20:00", end: "21:30", type: "training", titleId: "pregame", subteamId: "virsliga", venueId: "volvo" },
  { id: "e14", date: "2026-09-25", start: "19:00", end: "21:00", type: "game", titleId: "vs-tukums", subteamId: "virsliga", venueId: "inbox" },
  { id: "e15", date: "2026-09-28", start: "17:30", end: "19:00", type: "training", titleId: "ice", subteamId: "u18", venueId: "ogre" },
  { id: "e16", date: "2026-09-29", start: "19:30", end: "21:00", type: "training", titleId: "ice", subteamId: "rezerve", venueId: "daugava" },
  { id: "e17", date: "2026-09-30", start: "19:30", end: "21:30", type: "game", titleId: "vs-kurbads", subteamId: "virsliga", venueId: "volvo" },
  { id: "e18", date: "2026-10-02", start: "20:00", end: "21:30", type: "training", titleId: "ice", subteamId: "virsliga", venueId: "volvo" },
  { id: "e19", date: "2026-10-04", start: "17:00", end: "19:00", type: "game", titleId: "vs-mogo", subteamId: "virsliga", venueId: "inbox" },
  { id: "e20", date: "2026-10-06", start: "17:30", end: "19:00", type: "training", titleId: "ice", subteamId: "u18", venueId: "ogre" },
  { id: "e21", date: "2026-10-08", start: "19:30", end: "21:00", type: "training", titleId: "ice", subteamId: "rezerve", venueId: "daugava" },
];

export type BalanceEntry = {
  id: string;
  amount: number;
  at: string;
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
};

export const PLAYER_CHARGES: PlayerCharge[] = [
  { id: "c1", memberId: "m1", date: "2026-09-25", time: "19:00", amount: -40, kind: "event", type: "game", titleId: "vs-tukums", venueId: "inbox" },
  { id: "c2", memberId: "m1", date: "2026-09-24", time: "20:00", amount: -30, kind: "event", type: "training", titleId: "pregame", venueId: "volvo" },
  { id: "c3", memberId: "m1", date: "2026-09-19", time: "19:00", amount: -50, kind: "event", type: "game", titleId: "vs-liepaja", venueId: "volvo" },
  { id: "c4", memberId: "m2", date: "2026-09-25", time: "19:00", amount: -95, kind: "event", type: "game", titleId: "vs-tukums", venueId: "inbox" },
  { id: "c5", memberId: "m2", date: "2026-09-24", time: "20:00", amount: -40, kind: "event", type: "training", titleId: "pregame", venueId: "volvo" },
  { id: "c6", memberId: "m2", date: "2026-09-19", time: "19:00", amount: -85, kind: "event", type: "game", titleId: "vs-liepaja", venueId: "volvo" },
  { id: "c7", memberId: "m2", date: "2026-09-15", time: "20:00", amount: -56, kind: "event", type: "training", titleId: "situations", venueId: "inbox" },
  { id: "c8", memberId: "m3", date: "2026-09-24", time: "20:00", amount: -15, kind: "event", type: "training", titleId: "pregame", venueId: "volvo" },
  { id: "c9", memberId: "m3", date: "2026-09-19", time: "19:00", amount: -25, kind: "event", type: "game", titleId: "vs-liepaja", venueId: "volvo" },
  { id: "c10", memberId: "m4", date: "2026-09-22", time: "14:12", amount: 100, kind: "payment" },
  { id: "c11", memberId: "m4", date: "2026-09-05", time: "18:00", amount: -85, kind: "event", type: "game", titleId: "vs-jelgava", venueId: "inbox" },
  { id: "c12", memberId: "m5", date: "2026-09-25", time: "19:00", amount: -45, kind: "event", type: "game", titleId: "vs-tukums", venueId: "inbox" },
  { id: "c13", memberId: "m5", date: "2026-09-24", time: "20:00", amount: -40, kind: "event", type: "training", titleId: "pregame", venueId: "volvo" },
  { id: "c14", memberId: "m6", date: "2026-09-16", time: "16:00", amount: 108, kind: "payment" },
  { id: "c15", memberId: "m6", date: "2026-09-12", time: "16:00", amount: -72, kind: "event", type: "game", titleId: "vs-ogre", venueId: "daugava" },
  { id: "c16", memberId: "m6", date: "2026-09-03", time: "19:30", amount: -36, kind: "event", type: "training", titleId: "ice", venueId: "daugava" },
  { id: "c17", memberId: "m7", date: "2026-09-29", time: "19:30", amount: -80, kind: "event", type: "training", titleId: "ice", venueId: "daugava" },
  { id: "c18", memberId: "m7", date: "2026-09-22", time: "19:30", amount: -90, kind: "event", type: "training", titleId: "ice", venueId: "daugava" },
  { id: "c19", memberId: "m7", date: "2026-09-12", time: "16:00", amount: -150, kind: "event", type: "game", titleId: "vs-ogre", venueId: "daugava" },
  { id: "c20", memberId: "m7", date: "2026-09-03", time: "19:30", amount: -120, kind: "event", type: "training", titleId: "ice", venueId: "daugava" },
  { id: "c21", memberId: "m7", date: "2026-08-20", time: "18:00", amount: -104, kind: "event", type: "game", titleId: "vs-riga", venueId: "daugava" },
  { id: "c22", memberId: "m8", date: "2026-09-22", time: "19:30", amount: -24, kind: "event", type: "training", titleId: "ice", venueId: "daugava" },
  { id: "c23", memberId: "m8", date: "2026-09-12", time: "16:00", amount: -36, kind: "event", type: "game", titleId: "vs-ogre", venueId: "daugava" },
  { id: "c24", memberId: "m9", date: "2026-09-22", time: "19:30", amount: -18, kind: "event", type: "training", titleId: "ice", venueId: "daugava" },
  { id: "c25", memberId: "m10", date: "2026-09-21", time: "17:05", amount: 121, kind: "payment" },
  { id: "c26", memberId: "m10", date: "2026-09-17", time: "17:30", amount: -48, kind: "event", type: "training", titleId: "ice", venueId: "ogre" },
  { id: "c27", memberId: "m10", date: "2026-09-08", time: "17:30", amount: -48, kind: "event", type: "training", titleId: "skills", venueId: "ogre" },
  { id: "c28", memberId: "m11", date: "2026-09-17", time: "17:30", amount: -32, kind: "event", type: "training", titleId: "ice", venueId: "ogre" },
  { id: "c29", memberId: "m12", date: "2026-09-17", time: "17:30", amount: -48, kind: "event", type: "training", titleId: "ice", venueId: "ogre" },
  { id: "c30", memberId: "m12", date: "2026-09-08", time: "17:30", amount: -48, kind: "event", type: "training", titleId: "skills", venueId: "ogre" },
];

export function chargesForMember(memberId: string): PlayerCharge[] {
  return PLAYER_CHARGES.filter((charge) => charge.memberId === memberId).sort(
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

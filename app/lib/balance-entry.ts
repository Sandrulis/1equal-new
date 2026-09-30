import type { BalanceEntry, EventType } from "@/app/lib/demo-data";
import { toLocalDateTimeStamp } from "@/app/lib/format";

export const BALANCE_ENTRY_SELECT =
  "id, team_id, user_id, amount, kind, event_id, created_at, team_events(event_date, start_time, event_type, venues(name))";

type VenueJoin = { name?: string | null };
type EventJoin = {
  event_date?: string | null;
  start_time?: string | null;
  event_type?: string | null;
  venues?: VenueJoin | VenueJoin[] | null;
};

export type BalanceEntryRow = {
  id: string;
  amount: number | string;
  kind?: string | null;
  event_id?: string | null;
  created_at: string;
  team_events?: EventJoin | EventJoin[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function eventType(value: string | null | undefined): EventType | null {
  if (value === "game" || value === "training") return value;
  return null;
}

export function mapBalanceEntry(row: BalanceEntryRow): BalanceEntry {
  const event = one(row.team_events);
  const venue = one(event?.venues);
  const kind = row.kind === "event" ? "event" : "manual";
  return {
    id: row.id,
    amount: Number(row.amount),
    at: toLocalDateTimeStamp(row.created_at),
    kind,
    eventId: row.event_id ?? null,
    eventDate: event?.event_date ? event.event_date.slice(0, 10) : null,
    eventStart: event?.start_time ? event.start_time.slice(0, 5) : null,
    eventType: eventType(event?.event_type),
    venueName: venue?.name?.trim() || null,
  };
}

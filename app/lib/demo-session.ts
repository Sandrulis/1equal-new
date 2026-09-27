import type { TeamEvent } from "@/app/lib/demo-data";
import { eventHasEnded } from "@/app/lib/event-voting";
import type { TeamLedgerLine } from "@/app/lib/invite-code";

export type DemoRsvp = "going" | "absent" | "pending";

export type DemoSession = {
  rsvp: Record<string, Record<string, DemoRsvp>>;
  player: Record<string, number>;
  team: number;
  charges: TeamLedgerLine[];
  events: TeamEvent[];
  edits: Record<string, TeamEvent>;
  hidden: string[];
};

function emptySession(): DemoSession {
  return { rsvp: {}, player: {}, team: 0, charges: [], events: [], edits: {}, hidden: [] };
}

let session = emptySession();
const listeners = new Set<() => void>();

export function subscribeDemoSession(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getDemoSession(): DemoSession {
  return session;
}

function commit(next: DemoSession) {
  session = next;
  for (const listener of listeners) listener();
}

export function updateDemoSession(change: (current: DemoSession) => DemoSession) {
  const next = change(session);
  if (next !== session) commit(next);
}

type ChargeEvent = { id: string; date: string; start: string; end?: string; type: "game" | "training"; expense?: number | null };

export function settleDemoCharges(events: ChargeEvent[], now: number) {
  let charges = session.charges;
  let team = session.team;
  let changed = false;
  for (const event of events) {
    const cost = event.type === "game" && event.expense != null ? Math.round(event.expense * 100) / 100 : 0;
    const existing = charges.find((line) => line.eventId === event.id);
    if (!eventHasEnded(event, now) || cost <= 0) {
      if (!existing) continue;
      charges = charges.filter((line) => line !== existing);
      team = Math.round((team - existing.amount) * 100) / 100;
      changed = true;
      continue;
    }
    if (existing) {
      if (existing.amount === -cost && existing.eventDate === event.date && existing.eventType === event.type) continue;
      team = Math.round((team - existing.amount - cost) * 100) / 100;
      charges = charges.map((line) => (line === existing ? { ...line, amount: -cost, eventDate: event.date, eventType: event.type } : line));
      changed = true;
      continue;
    }
    charges = [
      ...charges,
      {
        id: `charge-${event.id}`,
        amount: -cost,
        at: new Date().toISOString(),
        eventId: event.id,
        eventDate: event.date,
        eventType: event.type,
      },
    ];
    team = Math.round((team - cost) * 100) / 100;
    changed = true;
  }
  if (!changed) return;
  commit({ ...session, charges, team });
}

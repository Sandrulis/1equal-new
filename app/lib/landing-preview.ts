type PreviewType = "game" | "training";

export type PreviewEvent = {
  id: string;
  date: string;
  start: string;
  type: PreviewType;
  area: string;
};

const SLOTS: { type: PreviewType; start: string; venueId: string }[] = [
  { type: "training", start: "20:00", venueId: "volvo" },
  { type: "training", start: "19:30", venueId: "daugava" },
  { type: "game", start: "18:00", venueId: "inbox" },
  { type: "training", start: "17:30", venueId: "ogre" },
  { type: "training", start: "20:00", venueId: "volvo" },
  { type: "game", start: "16:00", venueId: "daugava" },
  { type: "training", start: "20:00", venueId: "inbox" },
  { type: "game", start: "19:00", venueId: "volvo" },
];

const AREAS: Record<string, string> = {
  volvo: "Rīga",
  daugava: "Rīga",
  inbox: "Rīga",
  ogre: "Ogre",
};

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

function eventsForMonth(year: number, monthIndex: number): PreviewEvent[] {
  const days = monthDays(year, monthIndex, SLOTS.length);
  const month = String(monthIndex + 1).padStart(2, "0");
  return SLOTS.map((slot, index) => ({
    id: `preview-${year}${month}-${index + 1}`,
    date: `${year}-${month}-${String(days[index]).padStart(2, "0")}`,
    start: slot.start,
    type: slot.type,
    area: AREAS[slot.venueId] ?? "",
  }));
}

export function previewEvents(now = new Date()): PreviewEvent[] {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const events: PreviewEvent[] = [];
  for (let offset = 0; offset < 4; offset += 1) {
    const cursor = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    events.push(...eventsForMonth(cursor.getFullYear(), cursor.getMonth()));
  }
  return events;
}

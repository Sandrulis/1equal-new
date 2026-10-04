export const BALANCE_RANGE_MAX_DAYS = 92;

const ZONE = "Europe/Riga";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function rigaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function currentMonthRange(now = new Date()): { from: string; to: string } {
  const [year, month] = rigaDate(now).split("-").map(Number);
  return monthRange(year, month);
}

export function shiftMonth(from: string, delta: number): { from: string; to: string } {
  const [year, month] = from.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthRange(next.getUTCFullYear(), next.getUTCMonth() + 1);
}

export function rangeDays(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

export function balanceRangeOk(from: string, to: string): boolean {
  return DAY.test(from) && DAY.test(to) && from <= to && rangeDays(from, to) <= BALANCE_RANGE_MAX_DAYS;
}

export function rigaDayStartIso(isoDate: string): string {
  return zonedMidnight(isoDate).toISOString();
}

export function rigaDayEndExclusiveIso(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return zonedMidnight(next.toISOString().slice(0, 10)).toISOString();
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

function zonedMidnight(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utc));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const zoned = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
  return new Date(utc - (zoned - utc));
}

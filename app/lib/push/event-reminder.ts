import { isTimeZone } from "@/app/lib/display-preferences";

export const DEFAULT_EVENT_REMINDER = "08:00";
export const REMINDER_GRACE_MS = 70 * 60 * 1000;
const AFTER_START_MS = 15 * 60 * 1000;
export const REMINDER_HOUR_MIN = 1;
export const REMINDER_HOUR_MAX = 12;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const HOURS = /^(\d{1,2})h$/;

export function reminderHourCount(value: string): number | null {
  const match = HOURS.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  if (hours < REMINDER_HOUR_MIN || hours > REMINDER_HOUR_MAX) return null;
  return hours;
}

export function eventReminderValue(value: unknown): string | null {
  if (value === "off") return "off";
  if (typeof value === "string" && reminderHourCount(value) != null) return value;
  if (typeof value === "string" && CLOCK.test(value)) return value;
  return null;
}

export function storedEventReminder(value: unknown): string {
  return eventReminderValue(value) ?? DEFAULT_EVENT_REMINDER;
}

function zoneOffset(utcMs: number, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utcMs));
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    let year = read("year");
    let month = read("month");
    let day = read("day");
    let hour = read("hour");
    const minute = read("minute");
    const second = read("second");
    if (hour === 24) {
      hour = 0;
      const next = new Date(Date.UTC(year, month - 1, day + 1));
      year = next.getUTCFullYear();
      month = next.getUTCMonth() + 1;
      day = next.getUTCDate();
    }
    if (![year, month, day, hour, minute, second].every((part) => Number.isFinite(part))) return null;
    return Date.UTC(year, month - 1, day, hour, minute, second) - utcMs;
  } catch {
    return null;
  }
}

export function zonedInstant(date: string, time: string, timeZone: string): number | null {
  const dayText = date.slice(0, 10);
  const clock = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(time.trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayText) || !clock || !isTimeZone(timeZone)) return null;
  const [year, month, day] = dayText.split("-").map(Number);
  const hour = Number(clock[1]);
  const minute = Number(clock[2]);
  if (!year || !month || !day) return null;
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let pass = 0; pass < 3; pass += 1) {
    const offset = zoneOffset(utc, timeZone);
    if (offset == null) return null;
    utc = Date.UTC(year, month - 1, day, hour, minute) - offset;
  }
  return utc;
}

export function reminderMoment(input: {
  eventDate: string;
  startTime: string;
  preference: string;
  timeZone: string;
  eventTimeZone: string;
}): number | null {
  const preference = eventReminderValue(input.preference);
  if (!preference || preference === "off") return null;
  const hours = reminderHourCount(preference);
  if (hours != null) {
    const start = zonedInstant(input.eventDate, input.startTime, input.eventTimeZone);
    if (start == null) return null;
    return start - hours * 60 * 60 * 1000;
  }
  return zonedInstant(input.eventDate, preference, input.timeZone);
}

export function reminderIsDue(at: number, now: number, eventStart: number | null): boolean {
  if (now < at || now >= at + REMINDER_GRACE_MS) return false;
  if (eventStart != null && at <= eventStart && now > eventStart + AFTER_START_MS) return false;
  return true;
}

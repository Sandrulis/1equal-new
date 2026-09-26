import { DEFAULT_SITE_DISPLAY, type SiteDateFormat, type SiteDateSeparator, type SiteDisplaySettings, type SiteTimeFormat, type WeekStartDay } from "@/app/lib/display-preferences";
import { currencySymbol } from "@/app/lib/team-defaults";
import type { Lang } from "@/app/lib/messages";

export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(value.trim());
}

function applyDateSeparator(parts: string, separator: SiteDateSeparator): string {
  return parts.replace(/[./-]/g, separator);
}

function formatDateFromParts(year: number, month: number, day: number, format: SiteDateFormat, separator: SiteDateSeparator): string {
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  switch (format) {
    case "Y-m-d":
      return applyDateSeparator(`${yyyy}-${mm}-${dd}`, separator);
    case "d-m-Y":
      return applyDateSeparator(`${dd}-${mm}-${yyyy}`, separator);
    case "d/m/Y":
      return applyDateSeparator(`${dd}/${mm}/${yyyy}`, separator);
    case "m/d/Y":
      return applyDateSeparator(`${mm}/${dd}/${yyyy}`, separator);
    case "d.m.Y":
    default:
      return applyDateSeparator(`${dd}.${mm}.${yyyy}`, separator);
  }
}

export function formatDisplayDate(iso: string, preferences: SiteDisplaySettings = DEFAULT_SITE_DISPLAY): string {
  if (isInstant(iso)) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: preferences.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return formatDateFromParts(read("year"), read("month"), read("day"), preferences.dateFormat, preferences.dateSeparator);
  }
  const [year, month, day] = iso.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return iso;
  return formatDateFromParts(year, month, day, preferences.dateFormat, preferences.dateSeparator);
}

export function formatClock(value: string, timeFormat: SiteTimeFormat = "24"): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const hours24 = Number(match[1]);
  const minutes = match[2];
  if (timeFormat === "24") return `${String(hours24).padStart(2, "0")}:${minutes}`;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${minutes} ${period}`;
}

function formatInstant(value: string, preferences: SiteDisplaySettings): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: preferences.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const formattedDate = formatDateFromParts(Number(read("year")), Number(read("month")), Number(read("day")), preferences.dateFormat, preferences.dateSeparator);
  return `${formattedDate} ${formatClock(`${read("hour")}:${read("minute")}`, preferences.timeFormat)}`;
}

export function toLocalDateTimeStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDisplayDateTime(value: string, preferences: SiteDisplaySettings = DEFAULT_SITE_DISPLAY): string {
  if (isInstant(value)) return formatInstant(value, preferences);
  const [datePart, timePart] = value.split("T");
  const date = formatDisplayDate(datePart, preferences);
  if (!timePart) return date;
  return `${date} ${formatClock(timePart.slice(0, 5), preferences.timeFormat)}`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeUpdated(value: string, lang: Lang, now = new Date(), preferences: SiteDisplaySettings = DEFAULT_SITE_DISPLAY): string {
  const updated = isInstant(value) ? new Date(value) : parseLocalDateTime(value);
  const diff = now.getTime() - updated.getTime();
  if (diff < 0 || diff >= 31 * DAY_MS) return formatDisplayDateTime(value, preferences);
  if (diff < HOUR_MS) return countLabel(Math.max(1, Math.floor(diff / MINUTE_MS)), "minute", lang);
  if (diff < DAY_MS) return countLabel(Math.floor(diff / HOUR_MS), "hour", lang);
  return countLabel(Math.min(30, Math.floor(diff / DAY_MS)), "day", lang);
}

function parseLocalDateTime(value: string): Date {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0);
}

function countLabel(count: number, unit: "minute" | "hour" | "day", lang: Lang): string {
  if (lang === "en") {
    const word = unit === "minute" ? "minute" : unit === "hour" ? "hour" : "day";
    const singular = count === 1;
    return `${count} ${word}${singular ? "" : "s"}`;
  }
  if (lang === "ru") {
    const mod10 = count % 10;
    const mod100 = count % 100;
    const form = mod10 === 1 && mod100 !== 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? 1 : 2;
    const words = {
      minute: ["минута", "минуты", "минут"],
      hour: ["час", "часа", "часов"],
      day: ["день", "дня", "дней"],
    } as const;
    return `${count} ${words[unit][form]}`;
  }
  const singular = count % 10 === 1 && count % 100 !== 11;
  const word =
    unit === "minute" ? (singular ? "minūte" : "minūtes") : unit === "hour" ? (singular ? "stunda" : "stundas") : singular ? "diena" : "dienas";
  return `${count} ${word}`;
}

const WEEKDAYS: Record<Lang, readonly string[]> = {
  lv: ["svētdiena", "pirmdiena", "otrdiena", "trešdiena", "ceturtdiena", "piektdiena", "sestdiena"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ru: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
};

const MONTHS: Record<Lang, readonly string[]> = {
  lv: ["Janvāris", "Februāris", "Marts", "Aprīlis", "Maijs", "Jūnijs", "Jūlijs", "Augusts", "Septembris", "Oktobris", "Novembris", "Decembris"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
};

const WEEKDAY_HEADERS: Record<Lang, readonly string[]> = {
  lv: ["Pr", "Ot", "Tr", "Ce", "Pk", "Se", "Sv"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
};

export function weekdayHeaders(lang: Lang, weekStart: WeekStartDay = "monday"): readonly string[] {
  const headers = WEEKDAY_HEADERS[lang] ?? WEEKDAY_HEADERS.lv;
  if (weekStart === "monday") return headers;
  const sunday = lang === "en" ? "Sun" : lang === "ru" ? "Вс" : "Sv";
  return [sunday, ...headers.slice(0, 6)];
}

export function monthGrid(year: number, month: number, weekStart: WeekStartDay = "monday"): Date[] {
  const first = new Date(year, month, 1);
  const offset = weekStart === "sunday" ? first.getDay() : (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function formatWeekday(iso: string, lang: Lang): string {
  const names = WEEKDAYS[lang] ?? WEEKDAYS.lv;
  const name = names[parseIsoDate(iso).getDay()];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatMonthTitle(year: number, month: number, lang: Lang): string {
  const names = MONTHS[lang] ?? MONTHS.lv;
  return `${names[month]} ${year}`;
}

export function formatMoney(value: number, currency: string = "EUR"): string {
  const negative = value < 0;
  const [whole, fraction] = Math.abs(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}${currencySymbol(currency)} ${grouped}.${fraction}`;
}

export function hoursBetween(start: string, end: string): number {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (wholeHours > 0 && minutes > 0) return `${wholeHours} h ${minutes} min`;
  if (wholeHours > 0) return `${wholeHours} h`;
  return `${minutes} min`;
}

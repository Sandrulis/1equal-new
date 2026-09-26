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

export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("T")[0].split("-");
  return `${day}.${month}.${year}`;
}

export function toLocalDateTimeStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDisplayDateTime(value: string): string {
  const [datePart, timePart] = value.split("T");
  const date = formatDisplayDate(datePart);
  if (!timePart) return date;
  return `${date} ${timePart.slice(0, 5)}`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeUpdated(value: string, lang: Lang, now = new Date()): string {
  const updated = parseLocalDateTime(value);
  const diff = now.getTime() - updated.getTime();
  if (diff < 0 || diff >= 31 * DAY_MS) return formatDisplayDateTime(value);
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
  const singular = count % 10 === 1 && count % 100 !== 11;
  if ((lang ?? "lv") === "en") {
    const word = unit === "minute" ? "minute" : unit === "hour" ? "hour" : "day";
    return `${count} ${word}${singular ? "" : "s"}`;
  }
  const word =
    unit === "minute" ? (singular ? "minūte" : "minūtes") : unit === "hour" ? (singular ? "stunda" : "stundas") : singular ? "diena" : "dienas";
  return `${count} ${word}`;
}

const WEEKDAYS: Record<Lang, readonly string[]> = {
  lv: ["svētdiena", "pirmdiena", "otrdiena", "trešdiena", "ceturtdiena", "piektdiena", "sestdiena"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

const MONTHS: Record<Lang, readonly string[]> = {
  lv: ["Janvāris", "Februāris", "Marts", "Aprīlis", "Maijs", "Jūnijs", "Jūlijs", "Augusts", "Septembris", "Oktobris", "Novembris", "Decembris"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const WEEKDAY_HEADERS: Record<Lang, readonly string[]> = {
  lv: ["Pr", "Ot", "Tr", "Ce", "Pk", "Se", "Sv"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

export function weekdayHeaders(lang: Lang): readonly string[] {
  return WEEKDAY_HEADERS[lang];
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

export function formatMoney(value: number): string {
  const negative = value < 0;
  const [whole, fraction] = Math.abs(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}€ ${grouped}.${fraction}`;
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

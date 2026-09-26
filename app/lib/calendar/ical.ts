export type CalendarFeedEvent = {
  id: string;
  date: string;
  start: string;
  type: "game" | "training";
  teamName: string;
  venueName: string;
};

const ZONE = "Europe/Riga";

function escapeText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function foldLine(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (current && size + bytes > limit) {
      parts.push(current);
      current = char;
      size = bytes;
    } else {
      current += char;
      size += bytes;
    }
  }
  if (current) parts.push(current);
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n");
}

function stamp(date: Date) {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function wallClock(date: string, time: string, extraHours = 0) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const shifted = new Date(Date.UTC(year, (month ?? 1) - 1, day, (hour ?? 0) + extraHours, minute ?? 0));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${shifted.getUTCFullYear()}${pad(shifted.getUTCMonth() + 1)}${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}${pad(shifted.getUTCMinutes())}00`;
}

function typeLabel(type: CalendarFeedEvent["type"]) {
  return type === "game" ? "Spēle" : "Treniņš";
}

export function buildIcs(events: CalendarFeedEvent[], calendarName: string) {
  const now = stamp(new Date());
  const teams = new Set(events.map((event) => event.teamName));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//1Equal//Team Calendar//LV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:Europe/Riga",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Riga",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0300",
    "TZNAME:EEST",
    "DTSTART:19700329T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0200",
    "TZNAME:EET",
    "DTSTART:19701025T040000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const event of events) {
    const label = typeLabel(event.type);
    const place = event.venueName ? ` (${event.venueName})` : "";
    const summary = teams.size > 1 ? `${event.teamName}: ${label}${place}` : `${label}${place}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@1equal`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${ZONE}:${wallClock(event.date, event.start)}`,
      `DTEND;TZID=${ZONE}:${wallClock(event.date, event.start, 2)}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(event.teamName)}`,
      ...(event.venueName ? [`LOCATION:${escapeText(event.venueName)}`] : []),
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

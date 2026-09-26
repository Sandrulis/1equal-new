export type WeekStartDay = "monday" | "sunday";
export type SiteDateFormat = "Y-m-d" | "d-m-Y" | "d/m/Y" | "m/d/Y" | "d.m.Y";
export type SiteDateSeparator = "." | "-" | "/" | " ";
export type SiteTimeFormat = "12" | "24";

export type SiteDisplayPreferences = {
  weekStartDay: WeekStartDay;
  dateFormat: SiteDateFormat;
  dateSeparator: SiteDateSeparator;
  timeFormat: SiteTimeFormat;
};

export type SiteDisplaySettings = SiteDisplayPreferences & {
  timeZone: string;
};

export type UserDisplayPreferences = {
  weekStartDay: WeekStartDay | null;
  dateFormat: SiteDateFormat | null;
  dateSeparator: SiteDateSeparator | null;
  timeFormat: SiteTimeFormat | null;
  timezone: string | null;
};

export const EMPTY_USER_DISPLAY_PREFERENCES: UserDisplayPreferences = {
  weekStartDay: null,
  dateFormat: null,
  dateSeparator: null,
  timeFormat: null,
  timezone: null,
};

export const DEFAULT_SITE_DISPLAY: SiteDisplaySettings = {
  weekStartDay: "monday",
  dateFormat: "d.m.Y",
  dateSeparator: ".",
  timeFormat: "24",
  timeZone: "Europe/Riga",
};

const WEEK_START_DAYS = new Set<WeekStartDay>(["monday", "sunday"]);
const DATE_FORMATS = new Set<SiteDateFormat>(["Y-m-d", "d-m-Y", "d/m/Y", "m/d/Y", "d.m.Y"]);
const DATE_SEPARATORS = new Set<SiteDateSeparator>([".", "-", "/", " "]);
const TIME_FORMATS = new Set<SiteTimeFormat>(["12", "24"]);

export function isTimeZone(value: string): boolean {
  const zone = value.trim();
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeWeekStartDay(value: unknown): WeekStartDay {
  return typeof value === "string" && WEEK_START_DAYS.has(value as WeekStartDay) ? (value as WeekStartDay) : DEFAULT_SITE_DISPLAY.weekStartDay;
}

export function normalizeDateFormat(value: unknown): SiteDateFormat {
  return typeof value === "string" && DATE_FORMATS.has(value as SiteDateFormat) ? (value as SiteDateFormat) : DEFAULT_SITE_DISPLAY.dateFormat;
}

export function normalizeDateSeparator(value: unknown): SiteDateSeparator {
  return typeof value === "string" && DATE_SEPARATORS.has(value as SiteDateSeparator) ? (value as SiteDateSeparator) : DEFAULT_SITE_DISPLAY.dateSeparator;
}

export function normalizeTimeFormat(value: unknown): SiteTimeFormat {
  return typeof value === "string" && TIME_FORMATS.has(value as SiteTimeFormat) ? (value as SiteTimeFormat) : DEFAULT_SITE_DISPLAY.timeFormat;
}

export function normalizeSiteDisplay(value: {
  weekStartDay?: unknown;
  dateFormat?: unknown;
  dateSeparator?: unknown;
  timeFormat?: unknown;
  timeZone?: unknown;
} | null | undefined): SiteDisplaySettings {
  const timeZone = typeof value?.timeZone === "string" && isTimeZone(value.timeZone) ? value.timeZone.trim() : DEFAULT_SITE_DISPLAY.timeZone;
  return {
    weekStartDay: normalizeWeekStartDay(value?.weekStartDay),
    dateFormat: normalizeDateFormat(value?.dateFormat),
    dateSeparator: normalizeDateSeparator(value?.dateSeparator),
    timeFormat: normalizeTimeFormat(value?.timeFormat),
    timeZone,
  };
}

function optionalWeekStart(value: unknown): WeekStartDay | null {
  return typeof value === "string" && WEEK_START_DAYS.has(value as WeekStartDay) ? (value as WeekStartDay) : null;
}

function optionalDateFormat(value: unknown): SiteDateFormat | null {
  return typeof value === "string" && DATE_FORMATS.has(value as SiteDateFormat) ? (value as SiteDateFormat) : null;
}

function optionalDateSeparator(value: unknown): SiteDateSeparator | null {
  return typeof value === "string" && DATE_SEPARATORS.has(value as SiteDateSeparator) ? (value as SiteDateSeparator) : null;
}

function optionalTimeFormat(value: unknown): SiteTimeFormat | null {
  return typeof value === "string" && TIME_FORMATS.has(value as SiteTimeFormat) ? (value as SiteTimeFormat) : null;
}

export function readUserDisplayPreferences(row: {
  week_start_day?: string | null;
  date_format?: string | null;
  date_separator?: string | null;
  time_format?: string | null;
  timezone?: string | null;
} | null | undefined): UserDisplayPreferences {
  const timezone = row?.timezone?.trim() ?? "";
  return {
    weekStartDay: optionalWeekStart(row?.week_start_day),
    dateFormat: optionalDateFormat(row?.date_format),
    dateSeparator: optionalDateSeparator(row?.date_separator),
    timeFormat: optionalTimeFormat(row?.time_format),
    timezone: timezone && isTimeZone(timezone) ? timezone : null,
  };
}

export function mergeDisplayPreferences(system: SiteDisplaySettings, user: UserDisplayPreferences | null | undefined): SiteDisplaySettings {
  if (!user) return system;
  const timezone = user.timezone && isTimeZone(user.timezone) ? user.timezone : system.timeZone;
  return {
    weekStartDay: user.weekStartDay ?? system.weekStartDay,
    dateFormat: user.dateFormat ?? system.dateFormat,
    dateSeparator: user.dateSeparator ?? system.dateSeparator,
    timeFormat: user.timeFormat ?? system.timeFormat,
    timeZone: timezone,
  };
}

export function displaySettingsEqual(left: SiteDisplaySettings, right: SiteDisplaySettings): boolean {
  return left.weekStartDay === right.weekStartDay && left.dateFormat === right.dateFormat && left.dateSeparator === right.dateSeparator && left.timeFormat === right.timeFormat && left.timeZone === right.timeZone;
}

export function userDisplayEqual(left: UserDisplayPreferences, right: UserDisplayPreferences): boolean {
  return left.weekStartDay === right.weekStartDay && left.dateFormat === right.dateFormat && left.dateSeparator === right.dateSeparator && left.timeFormat === right.timeFormat && left.timezone === right.timezone;
}

export function timeZoneGroups(): { region: string; zones: string[] }[] {
  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [DEFAULT_SITE_DISPLAY.timeZone];
  const groups = new Map<string, string[]>();
  for (const zone of supported) {
    const region = zone.includes("/") ? zone.slice(0, zone.indexOf("/")) : "Other";
    const list = groups.get(region) ?? [];
    list.push(zone);
    groups.set(region, list);
  }
  return [...groups.entries()].map(([region, zones]) => ({ region, zones }));
}

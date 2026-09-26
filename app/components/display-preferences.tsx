"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import {
  DEFAULT_SITE_DISPLAY,
  timeZoneGroups,
  type SiteDateFormat,
  type SiteDateSeparator,
  type SiteDisplaySettings,
  type SiteTimeFormat,
  type UserDisplayPreferences,
  type WeekStartDay,
} from "@/app/lib/display-preferences";
import { formatClock, formatDisplayDate, formatDisplayDateTime, formatRelativeUpdated, weekdayHeaders } from "@/app/lib/format";

const DisplayContext = createContext<SiteDisplaySettings>(DEFAULT_SITE_DISPLAY);

export function DisplayPreferencesProvider({ value, children }: { value: SiteDisplaySettings; children: ReactNode }) {
  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
}

export function useEffectiveDisplay(): SiteDisplaySettings {
  return useContext(DisplayContext);
}

export function useDisplayFormat() {
  const display = useEffectiveDisplay();
  const { formatLang } = useLanguage();
  return {
    display,
    formatDate: (value: string) => formatDisplayDate(value, display),
    formatDateTime: (value: string) => formatDisplayDateTime(value, display),
    formatTime: (value: string) => formatClock(value, display.timeFormat),
    formatRelative: (value: string, now?: Date) => formatRelativeUpdated(value, formatLang, now, display),
    headers: weekdayHeaders(formatLang, display.weekStartDay),
  };
}

const DATE_FORMATS: SiteDateFormat[] = ["Y-m-d", "d-m-Y", "d/m/Y", "m/d/Y", "d.m.Y"];
const DATE_SEPARATORS: SiteDateSeparator[] = [".", "-", "/", " "];
const TIME_FORMATS: SiteTimeFormat[] = ["24", "12"];
const WEEK_START_DAYS: WeekStartDay[] = ["monday", "sunday"];
const WEEK_LABEL: Record<WeekStartDay, MessageKey> = {
  monday: "site_settings.form.week_start_day.monday",
  sunday: "site_settings.form.week_start_day.sunday",
};
const DATE_LABEL: Record<SiteDateFormat, MessageKey> = {
  "Y-m-d": "site_settings.form.date_format.Y-m-d",
  "d-m-Y": "site_settings.form.date_format.d-m-Y",
  "d/m/Y": "site_settings.form.date_format.d/m/Y",
  "m/d/Y": "site_settings.form.date_format.m/d/Y",
  "d.m.Y": "site_settings.form.date_format.d.m.Y",
};
const TIME_LABEL: Record<SiteTimeFormat, MessageKey> = {
  "24": "site_settings.form.time_format.24",
  "12": "site_settings.form.time_format.12",
};
const SEPARATOR_KEYS: Record<SiteDateSeparator, MessageKey> = {
  ".": "site_settings.form.date_separator.dot",
  "-": "site_settings.form.date_separator.dash",
  "/": "site_settings.form.date_separator.slash",
  " ": "site_settings.form.date_separator.space",
};

const selectClassName = "mt-2 w-full rounded-xl bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line outline-none focus:ring-navy disabled:cursor-not-allowed";

export function DisplayPreferencesFields({
  values,
  onChange,
  system,
  allowSystemDefault = false,
  disabled = false,
  idPrefix = "display",
}: {
  values: UserDisplayPreferences;
  onChange: (values: UserDisplayPreferences) => void;
  system: SiteDisplaySettings;
  allowSystemDefault?: boolean;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const { t } = useLanguage();
  const zones = timeZoneGroups();

  function systemLabel(current: string) {
    return t("profile.display.system_default", { value: current });
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium" htmlFor={`${idPrefix}-week`}>
        {t("site_settings.form.week_start_day")}
        <select
          id={`${idPrefix}-week`}
          name="weekStartDay"
          disabled={disabled}
          value={values.weekStartDay ?? ""}
          onChange={(event) => onChange({ ...values, weekStartDay: (event.target.value || null) as WeekStartDay | null })}
          className={selectClassName}
        >
          {allowSystemDefault ? <option value="">{systemLabel(t(WEEK_LABEL[system.weekStartDay]))}</option> : null}
          {WEEK_START_DAYS.map((value) => (
            <option key={value} value={value}>
              {t(WEEK_LABEL[value])}
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs font-normal text-muted">{t("site_settings.form.week_start_day_hint")}</span>
      </label>
      <div className="grid items-start gap-4 min-[600px]:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor={`${idPrefix}-date`}>
          {t("site_settings.form.date_format")}
          <select
            id={`${idPrefix}-date`}
            name="dateFormat"
            disabled={disabled}
            value={values.dateFormat ?? ""}
            onChange={(event) => onChange({ ...values, dateFormat: (event.target.value || null) as SiteDateFormat | null })}
            className={selectClassName}
          >
            {allowSystemDefault ? <option value="">{systemLabel(t(DATE_LABEL[system.dateFormat]))}</option> : null}
            {DATE_FORMATS.map((value) => (
              <option key={value} value={value}>
                {t(DATE_LABEL[value])}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor={`${idPrefix}-separator`}>
          {t("site_settings.form.date_separator")}
          <select
            id={`${idPrefix}-separator`}
            name="dateSeparator"
            disabled={disabled}
            value={values.dateSeparator ?? ""}
            onChange={(event) => onChange({ ...values, dateSeparator: (event.target.value || null) as SiteDateSeparator | null })}
            className={selectClassName}
          >
            {allowSystemDefault ? <option value="">{systemLabel(t(SEPARATOR_KEYS[system.dateSeparator]))}</option> : null}
            {DATE_SEPARATORS.map((value) => (
              <option key={value} value={value}>
                {t(SEPARATOR_KEYS[value])}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs font-normal text-muted">{t("site_settings.form.date_separator_hint")}</span>
        </label>
      </div>
      <div className="grid items-start gap-4 min-[600px]:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor={`${idPrefix}-time`}>
          {t("site_settings.form.time_format")}
          <select
            id={`${idPrefix}-time`}
            name="timeFormat"
            disabled={disabled}
            value={values.timeFormat ?? ""}
            onChange={(event) => onChange({ ...values, timeFormat: (event.target.value || null) as SiteTimeFormat | null })}
            className={selectClassName}
          >
            {allowSystemDefault ? <option value="">{systemLabel(t(TIME_LABEL[system.timeFormat]))}</option> : null}
            {TIME_FORMATS.map((value) => (
              <option key={value} value={value}>
                {t(TIME_LABEL[value])}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs font-normal text-muted">{t("site_settings.form.time_format_hint")}</span>
        </label>
        <label className="block text-sm font-medium" htmlFor={`${idPrefix}-zone`}>
          {t("site_settings.form.timezone")}
          <select
            id={`${idPrefix}-zone`}
            name="timezone"
            disabled={disabled}
            value={values.timezone ?? ""}
            onChange={(event) => onChange({ ...values, timezone: event.target.value || null })}
            className={selectClassName}
          >
            {allowSystemDefault ? <option value="">{systemLabel(system.timeZone)}</option> : null}
            {zones.map((group) => (
              <optgroup key={group.region} label={group.region}>
                {group.zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="mt-1.5 block text-xs font-normal text-muted">{allowSystemDefault ? t("profile.display.timezone_hint") : t("site_settings.form.timezone_hint")}</span>
        </label>
      </div>
    </div>
  );
}

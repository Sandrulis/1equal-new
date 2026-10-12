"use client";

import { useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useNativeApp } from "@/app/components/native-app-provider";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { saveEventEmails, saveEventReminder } from "@/app/lib/auth/actions";
import { useLanguage } from "@/app/lib/language";
import { DEFAULT_EVENT_REMINDER, eventReminderValue, reminderHourCount, REMINDER_HOUR_MAX, REMINDER_HOUR_MIN } from "@/app/lib/push/event-reminder";

function readReminder(value: string): { enabled: boolean; mode: "clock" | "hours"; time: string; hours: number } {
  const reminder = eventReminderValue(value) ?? DEFAULT_EVENT_REMINDER;
  const hours = reminderHourCount(reminder);
  if (reminder === "off") return { enabled: false, mode: "clock", time: DEFAULT_EVENT_REMINDER, hours: REMINDER_HOUR_MIN };
  if (hours != null) return { enabled: true, mode: "hours", time: DEFAULT_EVENT_REMINDER, hours };
  return { enabled: true, mode: "clock", time: reminder, hours: REMINDER_HOUR_MIN };
}

export function NotificationsDialog({
  enabled,
  reminder,
  onClose,
  onSaved,
}: {
  enabled: boolean;
  reminder: string;
  onClose: () => void;
  onSaved: (patch: { eventEmails?: boolean; eventReminder?: string }) => void;
}) {
  const { t } = useLanguage();
  const native = useNativeApp();
  const { showFeedback } = useFeedbackToast();
  const initial = readReminder(reminder);
  const [on, setOn] = useState(enabled);
  const [reminderOn, setReminderOn] = useState(initial.enabled);
  const [mode, setMode] = useState(initial.mode);
  const [time, setTime] = useState(initial.time);
  const [hours, setHours] = useState(initial.hours);
  const [saved, setSaved] = useState(eventReminderValue(reminder) ?? DEFAULT_EVENT_REMINDER);
  const [pending, setPending] = useState(false);

  async function toggleEmails() {
    if (pending) return;
    const next = !on;
    setPending(true);
    const result = await saveEventEmails(next);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setOn(next);
    onSaved({ eventEmails: next });
    showFeedback({ message: t("user.settings.saved"), variant: "success" });
  }

  async function saveReminder(value: string): Promise<boolean> {
    if (pending) return false;
    const parsed = eventReminderValue(value);
    if (!parsed) return false;
    if (parsed === saved) return true;
    setPending(true);
    const result = await saveEventReminder(parsed);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return false;
    }
    const next = readReminder(result.value);
    setSaved(result.value);
    setReminderOn(next.enabled);
    setMode(next.mode);
    if (next.mode === "clock" && next.enabled) setTime(next.time);
    if (next.mode === "hours") setHours(next.hours);
    onSaved({ eventReminder: result.value });
    showFeedback({ message: t("user.settings.saved"), variant: "success" });
    return true;
  }

  return (
    <AdminDialog open closeButton title={t("user.notices")} lead={t("user.notices.lead")} onClose={pending ? () => undefined : onClose}>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-ice px-3 py-2.5">
          <span>
            <span className="block text-sm font-medium">{t("user.notices.events")}</span>
            <span className="block text-xs text-muted">{t("user.notices.events_hint")}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={t("user.notices.events")}
            disabled={pending}
            onClick={() => void toggleEmails()}
            className={`relative h-6 w-11 shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${on ? "bg-train" : "bg-line"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper ${on ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
        {native ? (
        <div className="rounded-xl bg-ice px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">{t("user.notices.reminder")}</span>
              <span className="block text-xs text-muted">{t("user.notices.reminder_hint")}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={reminderOn}
              aria-label={t("user.notices.reminder")}
              disabled={pending}
              onClick={() => void saveReminder(reminderOn ? "off" : mode === "hours" ? `${hours}h` : time)}
              className={`relative h-6 w-11 shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${reminderOn ? "bg-train" : "bg-line"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper ${reminderOn ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
          {reminderOn ? (
            <div className="mt-3 grid grid-cols-2 items-stretch gap-2">
              <div className="flex h-9 min-w-0 rounded-lg bg-ice p-0.5 ring-1 ring-line" role="group" aria-label={t("user.notices.reminder")}>
                <button
                  type="button"
                  aria-pressed={mode === "clock"}
                  disabled={pending}
                  onClick={() => void saveReminder(time)}
                  className={`flex min-w-0 flex-1 items-center justify-center rounded-[5px] px-1 text-xs whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 ${mode === "clock" ? "bg-paper font-medium shadow-sm" : "text-muted"}`}
                >
                  {t("user.notices.reminder.day")}
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "hours"}
                  disabled={pending}
                  onClick={() => void saveReminder(`${hours}h`)}
                  className={`flex min-w-0 flex-1 items-center justify-center rounded-[5px] px-1 text-xs whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 ${mode === "hours" ? "bg-paper font-medium shadow-sm" : "text-muted"}`}
                >
                  {t("user.notices.reminder.before")}
                </button>
              </div>
              {mode === "clock" ? (
                <ReminderClock value={time} disabled={pending} onCommit={(next) => void saveReminder(next)} />
              ) : (
                <div className="flex h-9 min-w-0 items-stretch rounded-lg bg-ice p-0.5 ring-1 ring-line" role="group" aria-label={t("user.notices.reminder.before")}>
                  <button
                    type="button"
                    aria-label={t("user.notices.reminder.less")}
                    disabled={pending || hours <= REMINDER_HOUR_MIN}
                    onClick={() => void saveReminder(`${hours - 1}h`)}
                    className="flex flex-1 items-center justify-center rounded-[5px] px-1 text-xs text-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="flex flex-1 items-center justify-center rounded-[5px] bg-paper px-1 text-center text-xs font-medium whitespace-nowrap shadow-sm">
                    {t("user.notices.reminder.hours", { hours })}
                  </span>
                  <button
                    type="button"
                    aria-label={t("user.notices.reminder.more")}
                    disabled={pending || hours >= REMINDER_HOUR_MAX}
                    onClick={() => void saveReminder(`${hours + 1}h`)}
                    className="flex flex-1 items-center justify-center rounded-[5px] px-1 text-xs text-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
        ) : null}
      </div>
    </AdminDialog>
  );
}

const CLOCK_HOURS_24 = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const CLOCK_HOURS_12 = Array.from({ length: 12 }, (_, index) => String(index + 1));
const CLOCK_MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function hour24From12(displayHour: string, period: "AM" | "PM"): number {
  const hour = Number(displayHour);
  if (period === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function ReminderClock({ value, disabled, onCommit }: { value: string; disabled: boolean; onCommit: (value: string) => void }) {
  const { t } = useLanguage();
  const { display } = useDisplayFormat();
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hour24 = Number(match?.[1] ?? "8");
  const minute = match?.[2] ?? "00";
  const is12 = display.timeFormat === "12";
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = String(hour24 % 12 || 12);
  const selectClass = "h-full min-w-0 flex-1 bg-transparent text-center text-sm outline-none disabled:cursor-not-allowed";

  function commit(nextHour: string, nextMinute: string, nextPeriod: "AM" | "PM") {
    const hour = is12 ? hour24From12(nextHour, nextPeriod) : Number(nextHour);
    const clock = `${String(hour).padStart(2, "0")}:${nextMinute}`;
    if (eventReminderValue(clock)) onCommit(clock);
  }

  return (
    <div className="flex h-9 min-w-0 items-center rounded-lg bg-paper px-1 ring-1 ring-line">
      <select
        aria-label={t("user.notices.reminder.day")}
        disabled={disabled}
        value={is12 ? hour12 : String(hour24).padStart(2, "0")}
        onChange={(event) => commit(event.target.value, minute, period)}
        className={selectClass}
      >
        {(is12 ? CLOCK_HOURS_12 : CLOCK_HOURS_24).map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted">:</span>
      <select
        aria-label={t("user.notices.reminder.day")}
        disabled={disabled}
        value={minute}
        onChange={(event) => commit(is12 ? hour12 : String(hour24).padStart(2, "0"), event.target.value, period)}
        className={selectClass}
      >
        {CLOCK_MINUTES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {is12 ? (
        <select
          aria-label={t("user.notices.reminder.day")}
          disabled={disabled}
          value={period}
          onChange={(event) => commit(hour12, minute, event.target.value === "PM" ? "PM" : "AM")}
          className={selectClass}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      ) : null}
    </div>
  );
}

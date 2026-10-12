"use client";

import { useRef, useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
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
  const committedTime = useRef(initial.time);
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
    if (next.mode === "clock" && next.enabled) {
      setTime(next.time);
      committedTime.current = next.time;
    }
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
                <input
                  type="time"
                  value={time}
                  aria-label={t("user.notices.reminder.day")}
                  disabled={pending}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (eventReminderValue(next)) setTime(next);
                  }}
                  onBlur={(event) => {
                    const next = event.target.value;
                    if (!eventReminderValue(next)) {
                      setTime(committedTime.current);
                      return;
                    }
                    void saveReminder(next).then((ok) => {
                      if (!ok) setTime(committedTime.current);
                    });
                  }}
                  className="h-9 w-full rounded-lg bg-paper px-3 text-sm text-ink ring-1 ring-line disabled:cursor-not-allowed disabled:opacity-60"
                />
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

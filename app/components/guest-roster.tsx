"use client";

import { useMemo, useState } from "react";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import type { TrainingGuest } from "@/app/lib/invite-code";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { saveGuestNote } from "@/app/lib/training-guests";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function countKey(count: number): MessageKey {
  return count === 1 ? "pond.count.one" : "pond.count";
}

function contactLine(email: string, phone: string): string {
  return [email, phone].map((part) => part.trim()).filter(Boolean).join(" • ");
}

export function GuestRoster({
  guests,
  teamId,
  onNote,
}: {
  guests: TrainingGuest[];
  teamId: string | null;
  onNote: (userId: string, note: string) => void;
}) {
  const { t } = useLanguage();
  const { formatDate, formatTime } = useDisplayFormat();
  const [query, setQuery] = useState("");
  const people = useMemo(() => {
    const grouped = new Map<string, { userId: string; name: string; email: string; phone: string; note: string; visits: TrainingGuest[] }>();
    for (const guest of guests) {
      const row = grouped.get(guest.userId) ?? { userId: guest.userId, name: guest.name, email: guest.email, phone: guest.phone, note: guest.note, visits: [] };
      if (guest.name) row.name = guest.name;
      if (guest.email) row.email = guest.email;
      if (guest.phone) row.phone = guest.phone;
      if (guest.note) row.note = guest.note;
      row.visits.push(guest);
      grouped.set(guest.userId, row);
    }
    return [...grouped.values()].sort((left, right) => (left.name || left.email).localeCompare(right.name || right.email, "lv", { sensitivity: "base" }));
  }, [guests]);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? people.filter((person) => `${person.name} ${person.email} ${person.phone} ${person.note}`.toLowerCase().includes(needle))
    : people;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("pond.guests")}</h1>
      <p className="mt-1 text-sm text-muted">{t(countKey(people.length), { count: people.length })}</p>
      <label className="mt-4 flex items-center gap-2 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line focus-within:ring-train">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="sr-only">{t("pond.searchLabel")}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("pond.search")}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </label>
      <div className="mt-4 overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ice text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">{t("pond.guest")}</th>
                <th className="px-4 py-3 font-medium">{t("pond.trainings")}</th>
                <th className="px-4 py-3 font-medium">{t("pond.note")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-muted">{needle ? t("pond.search.empty") : t("pond.history.empty")}</td>
                </tr>
              ) : (
                visible.map((person) => {
                  const contact = contactLine(person.email, person.phone);
                  return (
                    <tr key={person.userId} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-3 align-top">
                        <span className="flex min-w-0 items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">{initials(person.name || person.email || t("pond.guest"))}</span>
                          <span className="min-w-0 flex-1 leading-5">
                            <span className="block truncate font-medium">{person.name || t("pond.guest")}</span>
                            {contact ? <span className="block truncate text-sm text-muted">{contact}</span> : null}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-muted">
                        <ul className="space-y-0.5">
                          {person.visits.map((visit) => (
                            <li key={visit.eventId}>
                              {formatDate(visit.date)} {formatTime(visit.start)}
                              {visit.venue ? ` ${visit.venue}` : ""}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="w-[16rem] px-4 py-3 align-top">
                        {teamId ? <GuestNote teamId={teamId} userId={person.userId} note={person.note} onSaved={(note) => onNote(person.userId, note)} /> : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GuestNote({ teamId, userId, note, onSaved }: { teamId: string; userId: string; note: string; onSaved: (note: string) => void }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [value, setValue] = useState(note);
  const [saved, setSaved] = useState(note);
  const [pending, setPending] = useState(false);
  if (note !== saved) {
    setSaved(note);
    setValue(note);
  }
  const dirty = value.trim() !== saved.trim();

  async function save() {
    if (!dirty || pending) return;
    setPending(true);
    const result = await saveGuestNote({ teamId, userId, note: value });
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setSaved(result.note);
    setValue(result.note);
    onSaved(result.note);
    showFeedback({ message: t("pond.note.saved"), variant: "success" });
  }

  return (
    <div>
      <textarea
        value={value}
        maxLength={500}
        rows={2}
        aria-label={t("pond.note")}
        placeholder={t("pond.note.placeholder")}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-lg bg-ice px-2 py-1.5 text-sm font-normal text-ink ring-1 ring-line"
      />
      {dirty || pending ? (
        <button type="button" disabled={pending} onClick={() => void save()} className="mt-1 rounded-lg bg-navy px-2.5 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
          {t("actions.save")}
        </button>
      ) : null}
    </div>
  );
}

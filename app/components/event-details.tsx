"use client";

import { type ReactNode } from "react";
import { IconCheck, IconTipButton, IconX } from "@/app/components/icon-tip-button";
import { MEMBERS, type Member, type TeamEvent } from "@/app/lib/demo-data";
import { formatDisplayDate, formatMoney, formatWeekday } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import { useTeamCatalog } from "@/app/lib/team-catalog";

export type Rsvp = "going" | "absent" | "pending";

export function eventPlayerFee(type: TeamEvent["type"]): number {
  return type === "game" ? 40 : 25;
}

export function defaultRsvp(eventId: string, index: number): Rsvp {
  const hash = [...eventId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bucket = (hash + index) % 4;
  if (bucket === 0) return "going";
  if (bucket === 1) return "absent";
  return "pending";
}

export function EventDetails({
  event,
  rsvp,
  onRsvp,
  onClose,
}: {
  event: TeamEvent;
  rsvp: Record<string, Rsvp> | undefined;
  onRsvp: (memberId: string, status: Rsvp) => void;
  onClose: () => void;
}) {
  const { formatLang, t } = useLanguage();
  const { venueById } = useTeamCatalog();
  const venue = venueById(event.venueId);
  const members = MEMBERS.filter((member) => member.subteamId === event.subteamId).sort((a, b) =>
    a.name.localeCompare(b.name, "lv"),
  );
  const fee = eventPlayerFee(event.type);
  const requested = fee * members.length;
  const statuses = members.map((member, index) => rsvp?.[member.id] ?? defaultRsvp(event.id, index));
  const going = members.filter((_, index) => statuses[index] === "going");
  const absent = members.filter((_, index) => statuses[index] === "absent");
  const pending = members.filter((_, index) => statuses[index] === "pending");
  const collected = fee * going.length;
  const percent = requested === 0 ? 0 : Math.round((collected / requested) * 100);

  return (
    <section id="event-details" className="mt-4 scroll-mt-4 rounded-2xl bg-paper ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-lg font-semibold">{t("event.details")}</h2>
        <IconTipButton label={t("event.close")} tone="muted" onClick={onClose}>
          <IconX />
        </IconTipButton>
      </div>

      <dl className="grid gap-2 px-4 py-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)] sm:px-5">
        <Detail label={t("event.date")} value={`${formatWeekday(event.date, formatLang)}, ${formatDisplayDate(event.date)}`} />
        <Detail label={t("event.time")} value={`${event.start}-${event.end}`} />
        <Detail label={t("event.type")} value={t(event.type === "game" ? "legend.game" : "legend.training")} />
        <Detail label={t("event.venue")} value={venue?.name ?? ""} />
        <Detail label={t("event.price")} value={formatMoney(fee)} />
      </dl>

      <div className="mx-4 mb-4 rounded-xl bg-ice px-4 py-3 sm:mx-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Summary label={t("event.requested")} value={formatMoney(requested)} />
          <Summary label={t("event.collected")} value={formatMoney(collected)} />
          <Summary label={t("event.participants")} value={String(going.length)} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-paper"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={t("event.collected")}
          >
            <div className="h-full rounded-full bg-train" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-sm font-medium tabular-nums">{percent}%</span>
        </div>
      </div>

      <div className="border-t border-line px-4 py-4 sm:px-5">
        <h3 className="mb-3 text-sm font-semibold text-train">{t("event.attendance")}</h3>
        <div className="space-y-3">
          <AttendanceGroup title={t("event.going")} count={going.length} tone="going" empty={t("event.none")}>
            {going.map((member) => (
              <PersonRow key={member.id} member={member} status="going" onRsvp={onRsvp} />
            ))}
          </AttendanceGroup>
          <AttendanceGroup title={t("event.absent")} count={absent.length} tone="absent" empty={t("event.none")}>
            {absent.map((member) => (
              <PersonRow key={member.id} member={member} status="absent" onRsvp={onRsvp} />
            ))}
          </AttendanceGroup>
          <AttendanceGroup title={t("event.pending")} count={pending.length} tone="pending" empty={t("event.none")}>
            {pending.map((member) => (
              <PersonRow key={member.id} member={member} status="pending" onRsvp={onRsvp} />
            ))}
          </AttendanceGroup>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <span className="mt-0.5 block font-semibold tabular-nums">{value}</span>
    </p>
  );
}

function AttendanceGroup({
  title,
  count,
  tone,
  empty,
  children,
}: {
  title: string;
  count: number;
  tone: Rsvp;
  empty: string;
  children: ReactNode;
}) {
  const bar = tone === "going" ? "bg-train" : tone === "absent" ? "bg-game" : "bg-navy";
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-line">
      <div className={`flex items-center justify-between px-3 py-2 text-sm font-medium text-white ${bar}`}>
        <span>{title}</span>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{count}</span>
      </div>
      {count === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">{empty}</p> : <ul className="divide-y divide-line">{children}</ul>}
    </div>
  );
}

function PersonRow({
  member,
  status,
  onRsvp,
}: {
  member: Member;
  status: Rsvp;
  onRsvp: (memberId: string, status: Rsvp) => void;
}) {
  const { t } = useLanguage();
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">
          {initials(member.name)}
        </span>
        <span className="truncate text-sm font-medium">{member.name}</span>
      </span>
      <span className="flex shrink-0 gap-1">
        <Choice
          label={t("event.going")}
          active={status === "going"}
          tone="going"
          onClick={() => onRsvp(member.id, status === "going" ? "pending" : "going")}
        />
        <Choice
          label={t("event.absent")}
          active={status === "absent"}
          tone="absent"
          onClick={() => onRsvp(member.id, status === "absent" ? "pending" : "absent")}
        />
      </span>
    </li>
  );
}

function Choice({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "going" | "absent";
  onClick: () => void;
}) {
  const activeClass = tone === "going" ? "bg-train text-white" : "bg-game text-white";
  const idleClass = tone === "going" ? "text-train hover:bg-train-soft" : "text-game hover:bg-game-soft";
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${active ? activeClass : idleClass}`}>
      {tone === "going" ? <IconCheck /> : <IconX />}
      {label}
    </button>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

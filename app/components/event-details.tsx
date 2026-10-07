"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { InviteEmailFields, listedEmails } from "@/app/components/invite-email-fields";
import { ContentImage } from "@/app/components/content-image";
import { IconCheck, IconTipButton, IconX } from "@/app/components/icon-tip-button";
import type { Member, TeamEvent } from "@/app/lib/demo-data";
import { formatJersey } from "@/app/lib/format-jersey";
import { eventHasEnded, eventVotingOpen, voteRemainingParts } from "@/app/lib/event-voting";
import { useFormatMoney } from "@/app/components/currency-provider";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { formatWeekday, hoursBetween } from "@/app/lib/format";
import { memberFaceUrl } from "@/app/lib/entuziasti-view";
import { isTrainerMember, type PositionCatalogItem } from "@/app/lib/positions";
import { useEntuziasti } from "@/app/components/entuziasti-context";
import { useLanguage } from "@/app/lib/language";
import { inviteTrainingGuests } from "@/app/lib/training-guests";

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

export function memberRsvp(
  eventId: string,
  memberId: string,
  index: number,
  rsvp: Record<string, Rsvp> | undefined,
  knownOnly: boolean,
): Rsvp {
  return rsvp?.[memberId] ?? (knownOnly ? "pending" : defaultRsvp(eventId, index));
}

export { eventVotingOpen };

export function VoteCountdown({ deadline, align = "start", compact = false, className = "" }: { deadline: number | null; align?: "start" | "end"; compact?: boolean; className?: string }) {
  const { t } = useLanguage();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (deadline == null) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  if (now == null || deadline == null || now >= deadline) return null;
  const left = voteRemainingParts(deadline - now);
  const bits = [
    ...(left.days > 0 ? [{ value: String(left.days), unit: t("event.vote.unit.d") }] : []),
    { value: String(left.hours).padStart(2, "0"), unit: t("event.vote.unit.h") },
    { value: String(left.minutes).padStart(2, "0"), unit: t("event.vote.unit.min") },
    { value: String(left.seconds).padStart(2, "0"), unit: t("event.vote.unit.s") },
  ];
  const end = align === "end";
  return (
    <div className={className}>
      {compact ? null : <p className={`text-xs text-muted ${end ? "text-right" : ""}`}>{t("event.vote.left")}</p>}
      <p className={`flex gap-1 ${compact ? "flex-nowrap" : "mt-1.5 flex-wrap"} ${end ? "justify-end" : ""}`}>
        {bits.map((bit) => (
          <span key={bit.unit} className={`inline-flex items-baseline justify-center gap-0.5 rounded-lg bg-paper ring-1 ring-line ${compact ? "min-w-8 px-1 py-0.5" : "min-w-11 px-1.5 py-1"}`}>
            <span className={`font-semibold tabular-nums text-ink ${compact ? "text-xs" : "text-sm"}`}>{bit.value}</span>
            <span className="text-[10px] text-muted">{bit.unit}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

export function LineupOpenButton({ pending, label, onClick }: { pending: boolean; label: string; onClick: () => void }) {
  const [tip, setTip] = useState<{ x: number; y: number; below: boolean } | null>(null);

  function place(target: HTMLButtonElement) {
    if (window.matchMedia("(max-width: 599px)").matches) return;
    const box = target.getBoundingClientRect();
    const below = box.top < 40;
    const x = Math.min(window.innerWidth - 12, Math.max(12, box.left + box.width / 2));
    setTip({ x, y: below ? box.bottom + 6 : box.top - 6, below });
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={pending}
        aria-busy={pending}
        onMouseEnter={(event) => place(event.currentTarget)}
        onMouseLeave={() => setTip(null)}
        onFocus={(event) => place(event.currentTarget)}
        onBlur={() => setTip(null)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-white disabled:cursor-not-allowed"
      >
        {pending ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <IconLineup />}
      </button>
      {tip ? (
        <span
          role="tooltip"
          style={{ left: tip.x, top: tip.y, transform: tip.below ? "translateX(-50%)" : "translate(-50%, -100%)" }}
          className="pointer-events-none fixed z-[80] rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
        >
          {label}
        </span>
      ) : null}
    </>
  );
}

function IconLineup() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="4.5" r="2.1" />
      <circle cx="5.5" cy="12" r="2.1" />
      <circle cx="18.5" cy="12" r="2.1" />
      <circle cx="12" cy="19.5" r="2.1" />
    </svg>
  );
}

export function EventDetails({
  event,
  members,
  venueName,
  fee: feeProp,
  voteDeadline = null,
  knownRsvp = false,
  actorId = null,
  leader = false,
  votingOpen = true,
  rsvp,
  reservedByUser = null,
  teamReserved = 0,
  onRsvp,
  onLineup,
  lineupPending = false,
  onEdit,
  onDelete,
  onClose,
  guestControls = false,
  guestHint = null,
  allowGuests = false,
  guests,
  guestBusy = false,
  onAllowGuests,
  onCopyGuestLink,
  onRemoveGuest,
  teamId = null,
  positions = [],
}: {
  event: TeamEvent;
  members: Member[];
  venueName: string;
  fee?: number;
  voteDeadline?: number | null;
  knownRsvp?: boolean;
  actorId?: string | null;
  leader?: boolean;
  votingOpen?: boolean;
  rsvp: Record<string, Rsvp> | undefined;
  reservedByUser?: Record<string, number> | null;
  teamReserved?: number;
  onRsvp: (memberId: string, status: Rsvp) => void;
  onLineup?: () => void;
  lineupPending?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
  guestControls?: boolean;
  guestHint?: "sport" | "team" | null;
  allowGuests?: boolean;
  guests?: { userId: string; name: string; email: string; phone: string }[];
  guestBusy?: boolean;
  onAllowGuests?: (allowed: boolean) => void;
  onCopyGuestLink?: () => void;
  onRemoveGuest?: (userId: string) => void;
  teamId?: string | null;
  positions?: PositionCatalogItem[];
}) {
  const { formatLang, t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [inviting, setInviting] = useState(false);
  const formatMoney = useFormatMoney();
  const { formatDate, formatTime } = useDisplayFormat();
  const fee = feeProp ?? eventPlayerFee(event.type);
  const ended = eventHasEnded(event);
  const statuses = members.map((member, index) => memberRsvp(event.id, member.id, index, rsvp, knownRsvp));
  const going = members.filter((_, index) => statuses[index] === "going");
  const absent = members.filter((_, index) => statuses[index] === "absent");
  const pending = members.filter((_, index) => statuses[index] === "pending");
  const collected = fee * going.filter((member) => !member.feeExempt).length;
  const exemptGoing = going.filter((member) => member.feeExempt).length;
  const signupCount = exemptGoing > 0 ? `${going.length} (${exemptGoing})` : String(going.length);
  const hours = event.end ? hoursBetween(event.start, event.end) : 0;
  const derived = hours > 0 && fee > 0 ? Math.round(hours * fee * 100) / 100 : 0;
  const requested = event.expense != null && event.expense > 0 ? event.expense : derived;
  const percent = requested === 0 ? 0 : Math.min(100, Math.round((collected / requested) * 100));

  return (
    <section id="event-details" className="mt-4 scroll-mt-4 rounded-2xl bg-paper ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-lg font-semibold">{t(event.type === "game" ? "legend.game" : "legend.training")}</h2>
        <span className="flex items-center gap-2">
          {onEdit ? (
            <button type="button" onClick={onEdit} className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-ice">
              {t("actions.edit")}
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" onClick={onDelete} className="rounded-lg px-3 py-1.5 text-sm font-medium text-game hover:bg-game-soft">
              {t("actions.delete")}
            </button>
          ) : null}
          {onLineup ? <LineupOpenButton pending={lineupPending} label={t("frontend_modules.game_layout")} onClick={onLineup} /> : null}
          <IconTipButton label={t("event.close")} tone="muted" onClick={onClose}>
            <IconX />
          </IconTipButton>
        </span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4 min-[600px]:flex-row min-[600px]:items-start min-[600px]:justify-between min-[600px]:px-5">
        <dl className="order-2 grid min-w-0 flex-1 gap-2 text-sm min-[600px]:order-1 min-[600px]:grid-cols-[8rem_minmax(0,1fr)]">
          <Detail label={t("event.date")} value={`${formatWeekday(event.date, formatLang)}, ${formatDate(event.date)}`} />
          <Detail label={t("event.time")} value={event.end ? `${formatTime(event.start)}-${formatTime(event.end)}` : formatTime(event.start)} />
          {event.type === "game" && event.home != null ? <Detail label={t("event.game.side")} value={t(event.home ? "event.game.home" : "event.game.away")} /> : null}
          {event.type === "training" ? <Detail label={t("event.coach")} value={event.withCoach ? t("event.add.coach") : t("event.add.coach.off")} /> : null}
          <Detail label={t("event.venue")} value={venueName} />
          <Detail label={t("event.price")} value={formatMoney(fee)} />
        </dl>
        <VoteCountdown deadline={voteDeadline} align="end" className="order-1 shrink-0 min-[600px]:order-2" />
      </div>
      {guestControls ? (
        <div className="mx-4 mb-4 flex flex-wrap items-center gap-2 sm:mx-5">
          <button
            type="button"
            disabled={guestBusy}
            onClick={() => onAllowGuests?.(!allowGuests)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${allowGuests ? "bg-train text-white" : "bg-ice text-ink ring-1 ring-line"}`}
          >
            {allowGuests ? <IconGuestOff /> : <IconGuestOn />}
            {allowGuests ? t("pond.disallow") : t("pond.allow")}
          </button>
          {allowGuests ? (
            <button type="button" disabled={guestBusy} onClick={onCopyGuestLink} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed disabled:opacity-40">
              <IconCopy />
              {t("pond.link")}
            </button>
          ) : null}
          {allowGuests ? (
            <button type="button" disabled={guestBusy} onClick={() => setInviting(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed disabled:opacity-40">
              <IconMail />
              {t("pond.invite")}
            </button>
          ) : null}
        </div>
      ) : guestHint ? (
        <p className="mx-4 mb-4 text-sm text-muted sm:mx-5">{t(guestHint === "team" ? "pond.need_team" : "pond.need_sport")}</p>
      ) : null}
      <GuestInviteDialog
        open={inviting}
        teamId={teamId}
        eventId={event.id}
        onClose={() => setInviting(false)}
        onDone={(count) => showFeedback({ message: t(count > 1 ? "pond.invite.saved.many" : "pond.invite.saved"), variant: "success" })}
      />
      {teamReserved > 0 ? <p className="px-4 pb-1 text-sm text-muted sm:px-5">{t("finance.reserved.team", { amount: formatMoney(teamReserved) })}</p> : null}

      <div className="mx-4 mb-4 rounded-xl bg-ice px-4 py-3 sm:mx-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Summary label={t("event.add.expense")} value={formatMoney(requested)} />
          <Summary label={t("event.collected")} value={formatMoney(collected)} />
          <Summary label={t("event.participants")} value={signupCount} />
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
          {guests && guests.length > 0 ? (
            <AttendanceGroup title={t("pond.guests")} count={guests.length} tone="pending" empty={t("pond.empty")}>
              {guests.map((guest) => (
                <li key={guest.userId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{guest.name || t("pond.guest")}</span>
                    {[guest.email, guest.phone].filter(Boolean).length ? <span className="block truncate text-xs text-muted">{[guest.email, guest.phone].filter(Boolean).join(" • ")}</span> : null}
                  </span>
                  {onRemoveGuest ? (
                    <button type="button" disabled={guestBusy} onClick={() => onRemoveGuest(guest.userId)} className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-game hover:bg-game-soft disabled:cursor-not-allowed disabled:opacity-40">
                      {t("pond.remove")}
                    </button>
                  ) : null}
                </li>
              ))}
            </AttendanceGroup>
          ) : null}
          <AttendanceGroup title={t("event.going")} count={going.length} extra={exemptGoing} tone="going" empty={t("event.none")}>
            {going.map((member) => (
              <PersonRow
                key={member.id}
                member={member}
                status="going"
                actorId={actorId}
                leader={leader}
                votingOpen={votingOpen}
                ended={ended}
                reservedLabel={reservedByUser && (reservedByUser[member.id] ?? 0) > 0 ? t("finance.reserved", { amount: formatMoney(reservedByUser[member.id] ?? 0) }) : null}
                positions={positions}
                onRsvp={onRsvp}
              />
            ))}
          </AttendanceGroup>
          <AttendanceGroup title={t("event.absent")} count={absent.length} tone="absent" empty={t("event.none")}>
            {absent.map((member) => (
              <PersonRow key={member.id} member={member} status="absent" actorId={actorId} leader={leader} votingOpen={votingOpen} ended={ended} positions={positions} onRsvp={onRsvp} />
            ))}
          </AttendanceGroup>
          <AttendanceGroup title={t("event.pending")} count={pending.length} tone="pending" empty={t("event.none")}>
            {pending.map((member) => (
              <PersonRow key={member.id} member={member} status="pending" actorId={actorId} leader={leader} votingOpen={votingOpen} ended={ended} positions={positions} onRsvp={onRsvp} />
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
  extra = 0,
  tone,
  empty,
  children,
}: {
  title: string;
  count: number;
  extra?: number;
  tone: Rsvp;
  empty: string;
  children: ReactNode;
}) {
  const bar = tone === "going" ? "bg-train" : tone === "absent" ? "bg-game" : "bg-navy";
  const label = extra > 0 ? `${count} (${extra})` : String(count);
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-line">
      <div className={`flex items-center justify-between px-3 py-2 text-sm font-medium text-white ${bar}`}>
        <span>{title}</span>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{label}</span>
      </div>
      {count === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">{empty}</p> : <ul className="divide-y divide-line">{children}</ul>}
    </div>
  );
}

function PersonRow({
  member,
  status,
  actorId,
  leader,
  votingOpen,
  ended = false,
  reservedLabel = null,
  positions = [],
  onRsvp,
}: {
  member: Member;
  status: Rsvp;
  actorId: string | null;
  leader: boolean;
  votingOpen: boolean;
  ended?: boolean;
  reservedLabel?: string | null;
  positions?: PositionCatalogItem[];
  onRsvp: (memberId: string, status: Rsvp) => void;
}) {
  const { t } = useLanguage();
  const mine = Boolean(actorId && member.id === actorId);
  const managed = Boolean(actorId);
  const coach = isTrainerMember(member, positions);
  const rowClass = coach ? "bg-game-soft" : "";
  if (managed && !mine && !leader) {
    return (
      <li className={`flex items-center justify-between gap-3 px-3 py-2 ${rowClass}`}>
        <PersonName member={member} reserved={reservedLabel} />
      </li>
    );
  }
  const locked = !leader && (ended || (managed && !votingOpen));
  const actionsClass = !managed || mine ? "flex shrink-0 gap-1" : "hidden shrink-0 gap-1 group-hover/player:flex max-[599px]:flex";
  return (
    <li className={`group/player flex items-center justify-between gap-3 px-3 py-2 ${rowClass}`}>
      <PersonName member={member} reserved={reservedLabel} />
      <span className={actionsClass}>
        <Choice
          label={t("event.going")}
          active={status === "going"}
          tone="going"
          disabled={locked}
          onClick={() => onRsvp(member.id, status === "going" ? "pending" : "going")}
        />
        <Choice
          label={t("event.absent")}
          active={status === "absent"}
          tone="absent"
          disabled={locked}
          onClick={() => onRsvp(member.id, status === "absent" ? "pending" : "absent")}
        />
      </span>
    </li>
  );
}

function PersonName({ member, reserved = null }: { member: Member; reserved?: string | null }) {
  const { t } = useLanguage();
  const jersey = formatJersey(member.number);
  const photo = memberFaceUrl(member, useEntuziasti());
  return (
    <span className="flex min-w-0 items-center gap-2">
      {photo ? (
        <ContentImage src={photo} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-ice object-contain object-center" />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">{initials(member.name)}</span>
      )}
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-medium">{member.name}</span>
          {member.feeExempt ? (
            <IconTipButton label={t("roster.fee_exempt.tip")} tone="muted" compact>
              <IconNoFee />
            </IconTipButton>
          ) : null}
        </span>
        {jersey ? <span className="block text-xs text-muted tabular-nums">{jersey}</span> : null}
        {reserved ? <span className="block truncate text-xs text-muted">{reserved}</span> : null}
      </span>
    </span>
  );
}

function IconGuestOn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2" />
      <path d="M16 11v6M19 14h-6" />
    </svg>
  );
}

function IconGuestOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2" />
      <path d="M17 11l4 4M21 11l-4 4" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
    </svg>
  );
}

function GuestInviteDialog({
  open,
  teamId,
  eventId,
  onClose,
  onDone,
}: {
  open: boolean;
  teamId: string | null;
  eventId: string;
  onClose: () => void;
  onDone: (count: number) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [emails, setEmails] = useState<string[]>([""]);
  const [pending, setPending] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setEmails([""]);
      setPending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const values = listedEmails(emails);
    if (!values.length || pending) return;
    if (!teamId) {
      onDone(values.length);
      onClose();
      return;
    }
    setPending(true);
    const result = await inviteTrainingGuests({ teamId, eventId, emails: values });
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    onDone(result.count);
    onClose();
  }

  return (
    <AdminDialog open={open} closeButton title={t("pond.invite.title")} lead={t("pond.invite.lead")} onClose={() => { if (!pending) onClose(); }}>
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <InviteEmailFields emails={emails} disabled={pending} onChange={setEmails} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" disabled={pending} onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {pending ? <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
            {t("pond.invite")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function IconNoFee() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12h8" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

function Choice({
  label,
  active,
  tone,
  disabled = false,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "going" | "absent";
  disabled?: boolean;
  onClick: () => void;
}) {
  const activeClass = tone === "going" ? "bg-train text-white" : "bg-game text-white";
  const idleClass = tone === "going" ? "text-train hover:bg-train-soft" : "text-game hover:bg-game-soft";
  return (
    <button type="button" onClick={onClick} aria-pressed={active} disabled={disabled} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${active ? activeClass : idleClass}`}>
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

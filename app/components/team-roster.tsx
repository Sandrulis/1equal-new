"use client";

import { useMemo, useState } from "react";
import { MEMBERS, TEAM_NAME, type Member } from "@/app/lib/demo-data";
import { PlayerProfile } from "@/app/components/player-profile";
import { formatDisplayDate, formatDisplayDateTime, formatMoney, formatRelativeUpdated } from "@/app/lib/format";
import { IconPencil, IconTipButton, IconTrash } from "@/app/components/icon-tip-button";
import { useLanguage } from "@/app/lib/language";
import { useTeamCatalog } from "@/app/lib/team-catalog";
import type { MessageKey } from "@/app/lib/messages";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function teamInitials(name: string): string {
  return initials(name).slice(0, 2);
}

function memberCountKey(count: number): MessageKey {
  return count === 1 ? "members.count.one" : "members.count";
}

export function TeamRoster({
  memberId,
  onOpenMember,
  onCloseMember,
}: {
  memberId: string | null;
  onOpenMember: (id: string) => void;
  onCloseMember: () => void;
}) {
  const { t } = useLanguage();
  const { subteamById } = useTeamCatalog();
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const player = memberId ? members.find((member) => member.id === memberId) : undefined;

  function openPlayer(id: string) {
    onOpenMember(id);
    window.scrollTo({ top: 0 });
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) => {
      const subteam = (subteamById(member.subteamId)?.name ?? "").toLowerCase();
      return [member.name, member.email, member.phone, String(member.number), member.position, subteam]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [members, query, subteamById, t]);

  if (player) {
    return (
      <div>
        <div className="mb-5">
          <button type="button" onClick={onCloseMember} className="inline-flex items-center gap-1.5 text-sm font-medium text-train">
            <ChevronLeft />
            {t("player.back")}
          </button>
        </div>
        <PlayerProfile member={player} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-navy text-lg font-semibold text-white">
            {teamInitials(TEAM_NAME)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{TEAM_NAME}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <IconUsers />
              {t(memberCountKey(members.length), { count: members.length })}
            </p>
          </div>
      </div>

      <label className="mb-4 flex max-w-xl items-center gap-2 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line focus-within:ring-train">
        <IconSearch />
        <span className="sr-only">{t("roster.searchLabel")}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("roster.search")}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </label>

      <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ice text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">{t("roster.member")}</th>
                <th className="hidden px-4 py-3 font-medium min-[768px]:table-cell">{t("roster.details")}</th>
                <th className="px-4 py-3 font-medium">{t("roster.balance")}</th>
                <th className="hidden px-4 py-3 font-medium min-[900px]:table-cell">{t("roster.joined")}</th>
                <th className="px-4 py-3 font-medium">{t("roster.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-muted">
                    {t("roster.empty")}
                  </td>
                </tr>
              ) : (
                visible.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => openPlayer(member.id)}
                      className="cursor-pointer border-b border-line last:border-b-0 hover:bg-ice"
                    >
                      <td className="w-full max-w-0 px-4 py-3">
                        <MemberIdentity member={member} />
                      </td>
                      <td className="hidden px-4 py-3 min-[768px]:table-cell">
                        <MemberMark member={member} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <MemberBalance member={member} />
                      </td>
                      <td className="hidden px-4 py-3 min-[900px]:table-cell">
                        <MemberDates member={member} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                        <MemberActions
                          memberId={member.id}
                          onRemove={(id) => setMembers((current) => current.filter((item) => item.id !== id))}
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MemberIdentity({ member }: { member: Member }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">
        {initials(member.name)}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{member.name}</span>
        <span className="block truncate text-muted">{member.email}</span>
        <span className="block text-muted">{member.phone}</span>
      </span>
    </div>
  );
}

function MemberMark({ member }: { member: Member }) {
  const { subteamById } = useTeamCatalog();
  const subteam = subteamById(member.subteamId);
  return (
    <span className="inline-flex items-start gap-2">
      <span className="inline-flex flex-col items-center">
        <span className="font-medium tabular-nums">#{member.number}</span>
        {subteam ? <SubteamSwatch color={subteam.color} name={subteam.name} /> : null}
      </span>
      <span className="rounded-md bg-ice px-2 py-0.5 text-xs font-semibold">{member.position}</span>
    </span>
  );
}

function SubteamSwatch({ color, name }: { color: string; name: string }) {
  return (
    <span className="group relative mt-1 inline-flex">
      <span className="block h-4 w-4 rounded-md" style={{ background: color }} title={name} />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white group-hover:block"
      >
        {name}
      </span>
    </span>
  );
}

function MemberBalance({ member }: { member: Member }) {
  return (
    <span className={`font-medium tabular-nums ${member.balance < 0 ? "text-game" : "text-ink"}`}>
      {formatMoney(member.balance)}
    </span>
  );
}

function MemberDates({ member }: { member: Member }) {
  const { lang } = useLanguage();
  return (
    <div>
      <span className="block tabular-nums" title={formatDisplayDateTime(member.updatedAt)}>
        {formatRelativeUpdated(member.updatedAt, lang)}
      </span>
      <span className="block text-xs text-muted tabular-nums">{formatDisplayDate(member.joined)}</span>
    </div>
  );
}

function MemberActions({ memberId, onRemove }: { memberId: string; onRemove: (id: string) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-1">
      <IconTipButton label={t("roster.edit")} tone="train">
        <IconPencil />
      </IconTipButton>
      <IconTipButton label={t("roster.remove")} tone="game" onClick={() => onRemove(memberId)}>
        <IconTrash />
      </IconTipButton>
    </div>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.75" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

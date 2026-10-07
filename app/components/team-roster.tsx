"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { BalanceHistory, BalanceRangeFields, useBalanceRange } from "@/app/components/balance-history";
import { AttendanceLegend, AttendanceLines, AttendanceMark } from "@/app/components/attendance-lines";
import { ContentImage } from "@/app/components/content-image";
import { PlayerContact } from "@/app/components/player-contact";
import { AdminDialog } from "@/app/components/admin-dialog";
import { AvatarCropField, type AvatarCropHandle } from "@/app/components/avatar-crop-field";
import { EhlTeamLinkField, sameEhlTeam, type ResolvedEhlTeam } from "@/app/components/ehl-team-link-field";
import { isOwnAvatarUrl } from "@/app/lib/avatar-url";
import { MemberEditDialog } from "@/app/components/member-edit-dialog";
import { teamLogoUrl } from "@/app/lib/entuziasti-view";
import { TeamMark } from "@/app/components/team-mark";
import type { Member, Subteam } from "@/app/lib/demo-data";
import type { TeamLedgerLine } from "@/app/lib/invite-code";
import { formatJersey } from "@/app/lib/format-jersey";
import { InviteEmailFields, listedEmails } from "@/app/components/invite-email-fields";
import { adjustMemberBalance, deleteTeamInvite, inviteTeamPlayer, listTeamInvites, removeOwnedMember, resendTeamInvite, saveTeamAvatar, setMemberTeamAdmin, updateOwnedTeam } from "@/app/lib/team-actions";
import { PlayerProfile } from "@/app/components/player-profile";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { MoneyVotingFields } from "@/app/components/money-voting-fields";
import { SportField } from "@/app/components/sport-switch";
import { useCurrencySymbol, useFormatMoney } from "@/app/components/currency-provider";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { votingHours } from "@/app/lib/team-defaults";
import { chosenSportId, type Sport } from "@/app/lib/sports";
import { entuziastiForSport } from "@/app/lib/frontend-modules";
import { parseEhlTeamUrl, teamNamesMatch } from "@/app/lib/ehl-team";
import { lookupEhlTeamName } from "@/app/lib/ehl-team-lookup";
import { IconPencil, IconTipButton, IconTrash, IconX } from "@/app/components/icon-tip-button";
import { readInviteBannerDismissed, subscribeInviteBanner, writeInviteBannerDismissed, clearInviteBannerDismissed } from "@/app/lib/invite-banner-cookie";
import { memberFaceUrl } from "@/app/lib/entuziasti-view";
import { useEntuziasti } from "@/app/components/entuziasti-context";
import { useLanguage } from "@/app/lib/language";
import { catalogForSport, formatPosition } from "@/app/lib/positions";
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

function memberCountKey(count: number): MessageKey {
  return count === 1 ? "members.count.one" : "members.count";
}

type TeamEntry = {
  id: string;
  description: string;
  amount: number;
  at: string;
};

export type BalanceHold = {
  id: string;
  amount: number;
  when: string;
  where: string;
  what: string;
};

export function TeamRoster({
  teamName,
  inviteCode,
  sourceUrl = null,
  logoUrl = null,
  homeKitUrl = null,
  awayKitUrl = null,
  initialMembers = [],
  teamId = null,
  leaderId = null,
  asLeader = false,
  accountId = null,
  trainingVotingHours = 24,
  gameVotingHours = 72,
  currency = null,
  sportId = null,
  sports = [],
  enabledModules = null,
  onTeamSaved,
  subteams,
  memberId,
  onOpenMember,
  onCloseMember,
  onMemberSaved,
  onMemberRemoved,
  finance = true,
  persistedBalance = 0,
  persistedEntries = [],
  teamHolds = [],
  memberHolds = {},
  attendanceOn = false,
  externalSettingsOpen = false,
  onExternalSettingsClose,
}: {
  teamName: string;
  inviteCode: string;
  sourceUrl?: string | null;
  logoUrl?: string | null;
  homeKitUrl?: string | null;
  awayKitUrl?: string | null;
  initialMembers?: Member[];
  teamId?: string | null;
  leaderId?: string | null;
  asLeader?: boolean;
  accountId?: string | null;
  trainingVotingHours?: number;
  gameVotingHours?: number;
  currency?: string | null;
  sportId?: string | null;
  sports?: Sport[];
  enabledModules?: string[] | null;
  onTeamSaved?: (team: { name: string; currency: string | null; trainingVotingHours: number; gameVotingHours: number; sourceUrl: string | null; logoUrl: string | null; sportId?: string }) => void;
  subteams?: Subteam[];
  memberId: string | null;
  onOpenMember: (id: string) => void;
  onCloseMember: () => void;
  onMemberSaved?: (member: Member, teamCode: string) => void;
  onMemberRemoved?: (id: string) => void;
  finance?: boolean;
  persistedBalance?: number;
  persistedEntries?: TeamEntry[];
  teamHolds?: BalanceHold[];
  memberHolds?: Record<string, BalanceHold[]>;
  attendanceOn?: boolean;
  externalSettingsOpen?: boolean;
  onExternalSettingsClose?: () => void;
}) {
  const { t, lang, languages } = useLanguage();
  const fallbackLang = languages.find((language) => language.isDefault)?.code ?? lang;
  const formatMoney = useFormatMoney();
  const { showFeedback } = useFeedbackToast();
  const { subteamById, subteams: catalogSubteams } = useTeamCatalog();
  const groupList = subteams ?? catalogSubteams;
  const inviteVisible = useSyncExternalStore<boolean | null>(
    subscribeInviteBanner,
    () => !readInviteBannerDismissed(inviteCode),
    () => null,
  );
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [memberSeed, setMemberSeed] = useState(initialMembers);
  if (members.length === 0 && initialMembers.length > 0 && memberSeed !== initialMembers) {
    setMemberSeed(initialMembers);
    setMembers(initialMembers);
  }
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [removePending, setRemovePending] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteScope, setInviteScope] = useState(teamId ?? "");
  const [pendingInvites, setPendingInvites] = useState<{ email: string; sentAt: string }[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);
  if ((teamId ?? "") !== inviteScope) {
    setInviteScope(teamId ?? "");
    setPendingInvites([]);
    setPendingOpen(false);
  }
  const [balancing, setBalancing] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [openHolds, setOpenHolds] = useState<BalanceHold[] | null>(null);
  const [teamEntries, setTeamEntries] = useState<TeamEntry[]>([]);
  const [adjusting, setAdjusting] = useState<Member | null>(null);
  function closeTeamSettings() {
    if (externalSettingsOpen) onExternalSettingsClose?.();
  }
  const [appointing, setAppointing] = useState(false);
  const isLeader = Boolean(teamId && accountId && (asLeader || (leaderId && leaderId === accountId)));
  const canAdjust = Boolean(teamId && accountId && (isLeader || members.some((member) => member.id === accountId && member.teamAdmin)));
  useEffect(() => {
    if (!teamId || !canAdjust) return;
    let active = true;
    void listTeamInvites(teamId).then((rows) => {
      if (active) setPendingInvites(rows);
    });
    return () => {
      active = false;
    };
  }, [teamId, canAdjust]);
  const showAttendance = attendanceOn && (canAdjust || members.some((member) => member.attendance));
  const sportKeys = sportId ? (sports.find((item) => item.id === sportId)?.moduleKeys ?? null) : null;
  const positionCatalog = catalogForSport(sportId, sports);
  const entuziasti = entuziastiForSport(enabledModules, sportKeys);
  const teamBalance = Math.round((persistedBalance + teamEntries.reduce((sum, entry) => sum + entry.amount, 0)) * 100) / 100;
  const teamReserved = Math.round(teamHolds.reduce((sum, hold) => sum + hold.amount, 0) * 100) / 100;
  const statementEntries = [...persistedEntries, ...teamEntries].sort((a, b) => b.at.localeCompare(a.at));
  const [previewId, setPreviewId] = useState<string | null>(memberId);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [seenMemberId, setSeenMemberId] = useState(memberId);
  const [ignoreRouteMember, setIgnoreRouteMember] = useState(false);
  if (memberId !== seenMemberId) {
    setSeenMemberId(memberId);
    if (ignoreRouteMember) {
      if (!memberId) setIgnoreRouteMember(false);
    } else {
      setPreviewId(memberId);
      setPreviewLoading(false);
    }
  }
  const player = previewId ? members.find((member) => member.id === previewId) : undefined;

  function openPlayer(id: string) {
    setIgnoreRouteMember(false);
    setPreviewId(id);
    if (memberId === id) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    onOpenMember(id);
  }

  function closePlayer() {
    setIgnoreRouteMember(true);
    setPreviewLoading(false);
    setPreviewId(null);
    onCloseMember();
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? members.filter((member) => {
          const ids = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
          const subteam = ids.map((id) => (groupList.find((item) => item.id === id) ?? subteamById(id))?.name ?? "").join(" ");
          const positions = [member.position, ...(member.extraPositions ?? [])].map((code) => formatPosition(code, positionCatalog, lang, fallbackLang, t).label);
          return [member.name, member.email, member.phone, formatJersey(member.number) ?? "", ...positions, subteam]
            .join(" ")
            .toLowerCase()
            .includes(needle);
        })
      : members;
    return [...matched].sort((left, right) => left.name.localeCompare(right.name, "lv", { sensitivity: "base" }));
  }, [fallbackLang, groupList, lang, members, positionCatalog, query, subteamById, t]);

  async function removeMember(id: string) {
    if (removePending) return;
    setRemovePending(true);
    if (teamId) {
      const result = await removeOwnedMember(teamId, id);
      if (!result.ok) {
        setRemovePending(false);
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      showFeedback({ message: t("roster.removed"), variant: "success" });
    }
    setMembers((current) => current.filter((item) => item.id !== id));
    onMemberRemoved?.(id);
    setRemoving(null);
    setRemovePending(false);
  }

  async function saveAdjustment(member: Member, amount: number) {
    if (!teamId) return;
    const result = await adjustMemberBalance({ teamId, userId: member.id, amount });
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    const next = { ...member, balance: result.balance, ledger: [], ledgerLoaded: false };
    setMembers((current) => current.map((item) => (item.id === member.id ? next : item)));
    onMemberSaved?.(next, inviteCode);
    setAdjusting(null);
    showFeedback({ message: t("roster.balance.saved"), variant: "success" });
  }

  async function toggleAdmin(member: Member) {
    if (!teamId || appointing) return;
    setAppointing(true);
    const result = await setMemberTeamAdmin({ teamId, userId: member.id, admin: member.teamAdmin !== true });
    setAppointing(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    const next = { ...member, teamAdmin: result.admin };
    setMembers((current) => current.map((item) => (item.id === member.id ? next : item)));
    onMemberSaved?.(next, inviteCode);
    showFeedback({ message: t(result.admin ? "roster.admin.on" : "roster.admin.off"), variant: "success" });
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between min-[600px]:gap-4">
        <div className="flex min-w-0 items-center gap-3 min-[600px]:gap-4">
          <TeamMark name={teamName} logoUrl={teamLogoUrl(logoUrl, entuziasti)} textClassName="text-lg" className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl min-[600px]:h-14 min-[600px]:w-14" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight min-[600px]:text-2xl">{teamName}</h1>
            {entuziasti && sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block max-w-full truncate text-sm text-train">
                {sourceUrl}
              </a>
            ) : null}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <IconUsers />
              {t(memberCountKey(members.length), { count: members.length })}
            </p>
          </div>
        </div>
        {finance ? (
          <div className="flex items-center justify-between gap-2 min-[600px]:shrink-0 min-[600px]:items-start min-[600px]:justify-end">
            <div className="text-right">
              <button type="button" onClick={() => setStatementOpen(true)} className="rounded-lg px-2 py-1 text-right hover:bg-paper">
                <span className="block text-xs text-muted">{t("roster.balance.team")}</span>
                <span className={`block text-lg font-semibold tabular-nums ${teamBalance < 0 ? "text-game" : "text-ink"}`}>{formatMoney(teamBalance)}</span>
              </button>
              {teamReserved > 0 ? (
                <button
                  type="button"
                  onClick={() => setOpenHolds(teamHolds)}
                  aria-label={t("finance.reserved.team", { amount: formatMoney(teamReserved) })}
                  className="block w-full whitespace-nowrap px-2 text-right text-xs text-muted tabular-nums hover:underline"
                >
                  {t("finance.reserved", { amount: formatMoney(teamReserved) })}
                </button>
              ) : null}
            </div>
            {canAdjust ? (
              <button type="button" onClick={() => setBalancing(true)} className="shrink-0 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
                {t("roster.balance.add")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {(!teamId || canAdjust) && inviteVisible ? (
      <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-paper px-4 py-3.5 ring-1 ring-line min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted">
          <IconLock />
          {t("team.invite.label")}
        </p>
        <div className="flex items-center gap-2">
          <span className="flex h-9 flex-1 items-center justify-center rounded-lg bg-ice px-3.5 text-center font-mono text-base font-semibold tracking-[0.22em] text-ink min-[600px]:flex-none">{inviteCode}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(inviteCode).then(
                () => showFeedback({ message: t("team.invite.copied"), variant: "success" }),
                () => showFeedback({ message: t("team.invite.copy_failed"), variant: "error" }),
              );
            }}
            className="grid h-9 shrink-0 place-items-center rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy/90"
          >
            {t("team.invite.copy")}
          </button>
          <button
            type="button"
            aria-label={t("event.close")}
            onClick={() => {
              writeInviteBannerDismissed(inviteCode);
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted ring-1 ring-line hover:bg-ice hover:text-ink"
          >
            <IconX />
          </button>
        </div>
      </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line focus-within:ring-train">
          <IconSearch />
          <span className="sr-only">{t("roster.searchLabel")}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("roster.search")}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
        {canAdjust && pendingInvites.length > 0 ? (
          <button type="button" onClick={() => setPendingOpen(true)} className="h-9 shrink-0 rounded-lg bg-paper px-4 text-sm font-medium text-ink ring-1 ring-line hover:bg-ice">
            {t("roster.invites.button", { count: pendingInvites.length })}
          </button>
        ) : null}
        {!teamId || canAdjust ? (
          <button type="button" onClick={() => setInviting(true)} className="h-9 shrink-0 rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy/90">
            {t("roster.invite")}
          </button>
        ) : null}
        {(!teamId || canAdjust) && inviteVisible === false ? (
          <button
            type="button"
            aria-label={t("team.invite.show")}
            onClick={() => {
              clearInviteBannerDismissed(inviteCode);
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-white hover:bg-navy/90"
          >
            <IconQr />
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ice text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">{t("roster.member")}</th>
                <th className="hidden px-4 py-3 text-center font-medium min-[768px]:table-cell">{t("roster.details")}</th>
                {showAttendance ? (
                  <th className="px-4 py-3 font-medium" aria-describedby="attendance-legend">
                    {t("roster.attendance")}
                    <AttendanceMark />
                  </th>
                ) : null}
                {finance ? <th className="hidden px-4 py-3 font-medium min-[600px]:table-cell">{t("roster.balance")}</th> : null}
                <th className="hidden px-4 py-3 font-medium min-[900px]:table-cell">{t("roster.joined")}</th>
                <th className="px-4 py-3 font-medium">{t("roster.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={4 + (finance ? 1 : 0) + (showAttendance ? 1 : 0)} className="px-4 py-8 text-muted">
                    {members.length === 0 && !query.trim() ? t("roster.none") : t("roster.empty")}
                  </td>
                </tr>
              ) : (
                visible.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => openPlayer(member.id)}
                      className="cursor-pointer border-b border-line last:border-b-0 hover:bg-ice"
                    >
                      <td className="w-full max-w-0 px-3 py-3 min-[600px]:px-4">
                        <MemberPhoneRow
                          member={member}
                          leader={member.id === leaderId}
                          groups={groupList}
                          positions={positionCatalog}
                          finance={finance}
                          holds={memberHolds[member.id] ?? []}
                          onHolds={(holds) => setOpenHolds(holds)}
                          onAdjust={canAdjust ? () => setAdjusting(member) : undefined}
                        />
                        <div className="hidden min-[600px]:block">
                          <MemberIdentity member={member} leader={member.id === leaderId} />
                        </div>
                        <div className="mt-2 hidden min-[600px]:block min-[768px]:hidden">
                          <MemberMark member={member} groups={groupList} positions={positionCatalog} row />
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-center whitespace-nowrap min-[768px]:table-cell">
                        <MemberMark member={member} groups={groupList} positions={positionCatalog} />
                      </td>
                      {showAttendance ? (
                        <td className="px-4 py-3">
                          {member.attendance ? <AttendanceLines stats={member.attendance} /> : <span className="text-muted">—</span>}
                        </td>
                      ) : null}
                      {finance ? (
                        <td className="hidden px-4 py-3 whitespace-nowrap min-[600px]:table-cell" onClick={(event) => event.stopPropagation()}>
                          <MemberBalance
                            member={member}
                            holds={memberHolds[member.id] ?? []}
                            onHolds={(holds) => setOpenHolds(holds)}
                            onAdjust={canAdjust ? () => setAdjusting(member) : undefined}
                          />
                        </td>
                      ) : null}
                      <td className="hidden px-4 py-3 min-[900px]:table-cell">
                        <MemberDates member={member} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                        <MemberActions
                          onEdit={!teamId || canAdjust || accountId === member.id ? () => setEditing(member) : undefined}
                          onRemove={!teamId || canAdjust || accountId === member.id ? () => setRemoving(member) : undefined}
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        {showAttendance ? <AttendanceLegend always /> : null}
      </div>
      {editing ? (
        <MemberEditDialog
          member={editing}
          teamId={teamId}
          remote={Boolean(teamId)}
          self={Boolean(accountId) && accountId === editing.id}
          canManage={!teamId || canAdjust || accountId === editing.id}
          canRoster={!teamId || canAdjust}
          canAppoint={isLeader && editing.id !== leaderId}
          entuziasti={entuziasti}
          positions={positionCatalog}
          subteams={groupList}
          onClose={() => setEditing(null)}
          onSaved={(member, teamCode) => {
            const previous = members.find((item) => item.id === member.id);
            const saved = previous ? { ...member, balance: previous.balance, ledger: previous.ledger, attendance: previous.attendance } : member;
            setMembers((current) => current.map((item) => (item.id === saved.id ? saved : item)));
            if (teamCode) onMemberSaved?.(saved, teamCode);
          }}
        />
      ) : null}
      {removing ? (
        <AdminDialog open closeButton title={t("roster.remove.title")} onClose={() => { if (!removePending) setRemoving(null); }}>
          <p className="text-sm text-muted">{t("roster.remove.confirm", { name: removing.name })}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" disabled={removePending} onClick={() => setRemoving(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
              {t("actions.cancel")}
            </button>
            <button type="button" disabled={removePending} onClick={() => void removeMember(removing.id)} className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              {t("roster.remove")}
            </button>
          </div>
        </AdminDialog>
      ) : null}
      <InvitePlayerDialog
        open={inviting}
        teamId={teamId}
        onClose={() => setInviting(false)}
        onDone={(count) => {
          showFeedback({ message: t(count > 1 ? "roster.invite.saved.many" : "roster.invite.saved"), variant: "success" });
          if (teamId && canAdjust) void listTeamInvites(teamId).then(setPendingInvites);
        }}
      />
      {teamId && pendingOpen ? (
        <PendingInvitesDialog
          invites={pendingInvites}
          teamId={teamId}
          onClose={() => setPendingOpen(false)}
          onChange={setPendingInvites}
        />
      ) : null}
      {teamId ? (
        <TeamSettingsDialog
          open={externalSettingsOpen}
          teamId={teamId}
          name={teamName}
          sourceUrl={sourceUrl}
          logoUrl={logoUrl}
          homeKitUrl={homeKitUrl}
          awayKitUrl={awayKitUrl}
          currency={currency}
          sportId={sportId}
          sports={sports}
          enabledModules={enabledModules}
          trainingHours={trainingVotingHours}
          gameHours={gameVotingHours}
          onClose={closeTeamSettings}
          onSave={async (next) => {
            const result = await updateOwnedTeam({ teamId, ...next, sportId: next.sportId });
            if (!result.ok) {
              showFeedback({ message: t(result.error), variant: "error" });
              return false;
            }
            onTeamSaved?.(result);
            showFeedback({ message: t("site_settings.saved"), variant: "success" });
            return true;
          }}
        />
      ) : null}
      <BalanceDialog
        open={balancing}
        title={t("roster.balance.add")}
        described
        onClose={() => setBalancing(false)}
        onAdd={(amount, description) => {
          setTeamEntries((current) => [
            { id: crypto.randomUUID(), description: description || t("player.manual"), amount, at: toLocalDateTimeStamp(new Date().toISOString()) },
            ...current,
          ]);
          showFeedback({ message: t("roster.balance.saved"), variant: "success" });
        }}
      />
      <TeamStatementDialog open={statementOpen} teamId={teamId} entries={statementEntries} onClose={() => setStatementOpen(false)} />
      <HoldDialog holds={openHolds} onClose={() => setOpenHolds(null)} />
      <BalanceDialog
        open={adjusting !== null}
        title={t("roster.balance.adjust")}
        onClose={() => setAdjusting(null)}
        onAdd={(amount) => {
          if (adjusting) void saveAdjustment(adjusting, amount);
        }}
      />
      {previewId ? (
        <AdminDialog open blur size="player" closeButton title={player && !previewLoading ? player.name : t("player.loading")} onClose={closePlayer}>
          {previewLoading || !player ? (
            <div className="flex flex-col items-center gap-3 py-12" role="status">
              <span className="size-8 animate-spin rounded-full border-2 border-line border-t-navy" aria-hidden="true" />
              <p className="text-sm text-muted">{t("player.loading")}</p>
            </div>
          ) : (
          <>
          {isLeader && player.id !== leaderId ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-ice px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium">{t("roles.admin")}</span>
                <span className="block text-xs text-muted">{t("roster.admin.hint")}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={player.teamAdmin === true}
                aria-label={t("roles.admin")}
                disabled={appointing}
                onClick={() => void toggleAdmin(player)}
                className={`relative h-6 w-11 shrink-0 rounded-full disabled:cursor-not-allowed ${player.teamAdmin ? "bg-train" : "bg-line"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper ${player.teamAdmin ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ) : null}
          <PlayerProfile member={player} subteams={groupList} positions={positionCatalog} finance={finance} leader={player.id === leaderId} teamId={teamId} embedded />
          </>
          )}
        </AdminDialog>
      ) : null}
    </div>
  );
}

const fieldClass = "mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train";

function InvitePlayerDialog({ open, teamId, onClose, onDone }: { open: boolean; teamId?: string | null; onClose: () => void; onDone: (count: number) => void }) {
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
      setEmails([""]);
      onDone(values.length);
      onClose();
      return;
    }
    setPending(true);
    const result = await inviteTeamPlayer(teamId, values);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setEmails([""]);
    onDone(result.count);
    onClose();
  }

  return (
    <AdminDialog open={open} closeButton title={t("roster.invite.title")} lead={t("roster.invite.lead")} onClose={() => { if (!pending) onClose(); }}>
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <InviteEmailFields emails={emails} disabled={pending} onChange={setEmails} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" disabled={pending} onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {pending ? <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
            {t("roster.invite")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function PendingInvitesDialog({
  invites,
  teamId,
  onClose,
  onChange,
}: {
  invites: { email: string; sentAt: string }[];
  teamId: string;
  onClose: () => void;
  onChange: (next: { email: string; sentAt: string }[]) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const { formatDateTime } = useDisplayFormat();
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  async function resend(email: string) {
    if (busyEmail) return;
    setBusyEmail(email);
    const result = await resendTeamInvite(teamId, email);
    setBusyEmail(null);
    if (!result.ok) {
      if (result.error === "roster.invites.joined") onChange(invites.filter((item) => item.email !== email));
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    onChange(invites.map((item) => (item.email === email ? { ...item, sentAt: result.sentAt } : item)));
    showFeedback({ message: t("roster.invites.resent"), variant: "success" });
  }

  async function remove(email: string) {
    if (busyEmail) return;
    setBusyEmail(email);
    const result = await deleteTeamInvite(teamId, email);
    setBusyEmail(null);
    setConfirmEmail(null);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    onChange(invites.filter((item) => item.email !== email));
    showFeedback({ message: t("roster.invites.deleted"), variant: "success" });
  }

  return (
    <AdminDialog open closeButton title={t("roster.invites.title")} lead={t("roster.invites.lead")} onClose={() => { if (!busyEmail) onClose(); }}>
      {invites.length === 0 ? <p className="text-sm text-muted">{t("roster.invites.empty")}</p> : (
      <ul className="space-y-2">
        {invites.map((item) => (
          <li key={item.email} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ice px-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{item.email}</span>
              <span className="block text-xs text-muted">{t("roster.invites.sent", { when: formatDateTime(item.sentAt) })}</span>
            </span>
            {confirmEmail === item.email ? (
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-sm text-muted">{t("roster.invites.delete_confirm")}</span>
                <button type="button" disabled={busyEmail !== null} onClick={() => setConfirmEmail(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-paper disabled:cursor-not-allowed">
                  {t("actions.cancel")}
                </button>
                <button type="button" disabled={busyEmail !== null} onClick={() => void remove(item.email)} className="inline-flex items-center gap-2 rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                  {busyEmail === item.email ? <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
                  {t("actions.delete")}
                </button>
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-2">
                <button type="button" disabled={busyEmail !== null} onClick={() => setConfirmEmail(item.email)} className="rounded-lg px-3 py-2 text-sm font-medium text-game hover:bg-paper disabled:cursor-not-allowed">
                  {t("actions.delete")}
                </button>
                <button
                  type="button"
                  disabled={busyEmail !== null}
                  onClick={() => void resend(item.email)}
                  className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyEmail === item.email ? <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
                  {t("roster.invites.resend")}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      )}
    </AdminDialog>
  );
}

function TeamStatementDialog({ open, teamId, entries, onClose }: { open: boolean; teamId: string | null; entries: TeamEntry[]; onClose: () => void }) {
  const { t } = useLanguage();
  const { formatDate, formatDateTime } = useDisplayFormat();
  const range = useBalanceRange();
  const [remote, setRemote] = useState<TeamLedgerLine[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = `${teamId ?? ""}:${range.from}:${range.to}`;
  const pending = Boolean(open && teamId && range.allowed && loadedKey !== requestKey);
  useEffect(() => {
    if (!open || !teamId || !range.allowed) return;
    let active = true;
    void fetch(`/api/teams/${teamId}/ledger?from=${range.from}&to=${range.to}`)
      .then(async (response) => (response.ok ? ((await response.json()) as { ok?: boolean; entries?: TeamLedgerLine[] }) : null))
      .then((body) => {
        if (!active) return;
        setRemote(body?.ok && body.entries ? body.entries : []);
        setLoadedKey(requestKey);
      })
      .catch(() => {
        if (!active) return;
        setRemote([]);
        setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [open, range.allowed, range.from, range.to, requestKey, teamId]);
  const local = entries.filter((entry) => {
    const day = entry.at.slice(0, 10);
    return day >= range.from && day <= range.to;
  });
  const remoteItems = teamId
    ? remote.map((line) => {
        const description = t("team.ledger.event", {
          type: t(line.eventType === "game" ? "legend.game" : "legend.training"),
          date: formatDate(line.eventDate),
        });
        return {
          id: line.id,
          title: line.venueName ? `${description} · ${line.venueName}` : description,
          when: `${formatDate(line.eventDate)} · ${t("player.source.system")}`,
          amount: line.amount,
        };
      })
    : [];
  const items = [
    ...remoteItems,
    ...local.map((entry) => ({
      id: entry.id,
      title: entry.description,
      when: `${formatDateTime(entry.at)} · ${t("player.source.system")}`,
      amount: entry.amount,
    })),
  ];

  return (
    <AdminDialog open={open} title={t("roster.balance.statement")} onClose={onClose}>
      <BalanceRangeFields from={range.from} to={range.to} onChange={range.setRange} />
      {range.allowed ? null : <p className="py-8 text-sm text-muted">{t("balance.range.long")}</p>}
      {!range.allowed ? null : pending ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted" role="status">
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-navy" aria-hidden="true" />
          {t("player.ledger.loading")}
        </div>
      ) : (
        <BalanceHistory items={items} empty={t("roster.balance.statement.empty")} />
      )}
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg bg-ice px-4 py-2 text-sm font-medium">
          {t("event.close")}
        </button>
      </div>
    </AdminDialog>
  );
}

const LINK_ERROR: Record<"invalid" | "not_found" | "failed", MessageKey> = {
  invalid: "team.link.invalid",
  not_found: "team.link.not_found",
  failed: "team.link.failed",
};

function TeamSettingsDialog({
  open,
  teamId,
  name,
  sourceUrl,
  logoUrl,
  homeKitUrl = null,
  awayKitUrl = null,
  currency,
  trainingHours,
  gameHours,
  sportId,
  sports,
  enabledModules = null,
  onClose,
  onSave,
}: {
  open: boolean;
  teamId: string;
  name: string;
  sourceUrl: string | null;
  logoUrl: string | null;
  homeKitUrl?: string | null;
  awayKitUrl?: string | null;
  currency: string | null;
  trainingHours: number;
  gameHours: number;
  sportId: string | null;
  sports: Sport[];
  enabledModules?: string[] | null;
  onClose: () => void;
  onSave: (next: { name: string; currency: string | null; trainingVotingHours: number; gameVotingHours: number; sourceUrl: string | null; logoUrl: string | null; sportId: string | null }) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const brand = useSiteBrand();
  const [draftName, setDraftName] = useState(name);
  const [draftLink, setDraftLink] = useState(sourceUrl ?? "");
  const [linkBusy, setLinkBusy] = useState(false);
  const [draftCurrency, setDraftCurrency] = useState(currency);
  const [training, setTraining] = useState(String(trainingHours));
  const [game, setGame] = useState(String(gameHours));
  const [draftSport, setDraftSport] = useState(sportId ?? "");
  const [busy, setBusy] = useState<"lookup" | "save" | null>(null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const avatarRef = useRef<AvatarCropHandle>(null);
  const previewRef = useRef<ResolvedEhlTeam | null>(null);
  const [mismatch, setMismatch] = useState<{ remote: string; url: string; logoUrl: string | null } | null>(null);
  const settingsKey = `${open}|${name}|${sourceUrl ?? ""}|${currency ?? ""}|${trainingHours}|${gameHours}|${sportId ?? ""}`;
  const [seenSettings, setSeenSettings] = useState(settingsKey);
  if (settingsKey !== seenSettings) {
    setSeenSettings(settingsKey);
    if (open) {
      setDraftName(name);
      setDraftLink(sourceUrl ?? "");
      setDraftCurrency(currency);
      setTraining(String(trainingHours));
      setGame(String(gameHours));
      setDraftSport(sportId ?? "");
      setBusy(null);
      setAvatarDirty(false);
      setMismatch(null);
    }
  }

  const trainingValue = votingHours(training);
  const gameValue = votingHours(game);
  const hoursOk = trainingValue != null && gameValue != null;
  const pickedSport = chosenSportId(sports, draftSport);
  const showLink = entuziastiForSport(enabledModules, pickedSport ? (sports.find((item) => item.id === pickedSport)?.moduleKeys ?? null) : null);
  const savedUrl = parseEhlTeamUrl(sourceUrl ?? "")?.toString() ?? "";
  const storedPreview: ResolvedEhlTeam | null = savedUrl
    ? { name, url: savedUrl, logoUrl, homeKitUrl: homeKitUrl ?? null, awayKitUrl: awayKitUrl ?? null }
    : null;
  const linkValue = showLink ? draftLink.trim() : (sourceUrl ?? "");
  const showAvatar = linkValue === "";
  const dirty = draftName.trim() !== name || (showLink && draftLink.trim() !== (sourceUrl ?? "")) || draftCurrency !== currency || trainingValue !== trainingHours || gameValue !== gameHours || pickedSport !== (sportId ?? null) || (showAvatar && avatarDirty);

  async function resolveLogo(nextSource: string | null, ehlLogo: string | null): Promise<string | null | undefined> {
    if (nextSource) return ehlLogo;
    const crop = await avatarRef.current?.result();
    if (!crop || !crop.changed) return isOwnAvatarUrl(logoUrl) ? logoUrl : null;
    if (crop.remove) return null;
    if (!crop.file) {
      showFeedback({ message: t("avatar.error.file"), variant: "error" });
      return undefined;
    }
    const body = new FormData();
    body.set("teamId", teamId);
    body.set("file", crop.file);
    const uploaded = await saveTeamAvatar(body);
    if (!uploaded.ok) {
      showFeedback({ message: t(uploaded.error), variant: "error" });
      return undefined;
    }
    return uploaded.url;
  }

  async function persist(nextSource: string | null, nextLogo: string | null) {
    if (trainingValue == null || gameValue == null) return;
    setBusy("save");
    const saved = await onSave({
      name: draftName.trim(),
      currency: draftCurrency,
      trainingVotingHours: trainingValue,
      gameVotingHours: gameValue,
      sourceUrl: nextSource,
      logoUrl: nextLogo,
      sportId: pickedSport,
    });
    setBusy(null);
    if (saved) onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draftName.trim() || !hoursOk || !dirty || busy || linkBusy) return;
    const cached = sameEhlTeam(linkValue, previewRef.current) ? previewRef.current : null;
    if (!linkValue) {
      const nextLogo = await resolveLogo(null, null);
      if (nextLogo === undefined) return;
      await persist(null, nextLogo);
      return;
    }
    if (linkValue === (sourceUrl ?? "") && !cached) {
      await persist(sourceUrl, logoUrl);
      return;
    }
    let result = cached;
    if (!result) {
      setBusy("lookup");
      const looked = await lookupEhlTeamName(linkValue);
      setBusy(null);
      if (!looked.ok) {
        showFeedback({ message: t(LINK_ERROR[looked.error]), variant: "error" });
        return;
      }
      result = looked;
    }
    if (!teamNamesMatch(draftName, result.name)) {
      setMismatch({ remote: result.name, url: result.url, logoUrl: result.logoUrl });
      return;
    }
    await persist(result.url, result.logoUrl);
  }

  return (
    <>
      <AdminDialog open={open && mismatch === null} title={t("team.settings.title")} onClose={onClose}>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {showLink ? (
            <EhlTeamLinkField
              value={draftLink}
              disabled={busy !== null}
              seed={storedPreview}
              inputClassName={fieldClass}
              onChange={(next) => {
                setDraftLink(next);
                if (next.trim()) setAvatarDirty(false);
              }}
              onLoading={setLinkBusy}
              onResolved={(next) => {
                previewRef.current = next;
                if (next && next.url !== savedUrl) setDraftName(next.name.slice(0, 80));
              }}
            />
          ) : null}
          <label className="block text-sm">
            <span className="text-muted">{t("team.settings.name")}</span>
            <input required value={draftName} maxLength={80} disabled={busy !== null || linkBusy} onChange={(event) => setDraftName(event.target.value)} className={`${fieldClass} disabled:opacity-60`} />
          </label>
          {showAvatar ? (
            <AvatarCropField
              ref={avatarRef}
              existingUrl={isOwnAvatarUrl(logoUrl) ? logoUrl : null}
              disabled={busy !== null}
              onDirty={setAvatarDirty}
            />
          ) : null}
          <SportField sports={sports} value={pickedSport ?? ""} onChange={setDraftSport} disabled={busy !== null} />
          <MoneyVotingFields
            idPrefix="team-settings"
            currency={draftCurrency}
            trainingHours={training}
            gameHours={game}
            systemCurrency={brand.currency}
            allowSystemCurrency
            disabled={busy !== null}
            onCurrency={setDraftCurrency}
            onTrainingHours={setTraining}
            onGameHours={setGame}
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={busy !== null} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
              {t("actions.cancel")}
            </button>
            <button type="submit" disabled={!dirty || !hoursOk || busy !== null || linkBusy} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              {busy === "lookup" ? t("team.empty.checking") : t("actions.save")}
            </button>
          </div>
        </form>
      </AdminDialog>
      <AdminDialog
        open={mismatch !== null}
        title={t("team.name.mismatch.title")}
        lead={mismatch ? t("team.settings.link_mismatch", { remote: mismatch.remote, entered: draftName.trim() }) : undefined}
        onClose={() => setMismatch(null)}
      >
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setMismatch(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice">
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = mismatch?.url ?? null;
              const nextLogo = mismatch?.logoUrl ?? null;
              setMismatch(null);
              void persist(url, nextLogo);
            }}
            className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white"
          >
            {t("actions.save")}
          </button>
        </div>
      </AdminDialog>
    </>
  );
}

function BalanceDialog({
  open,
  title,
  described = false,
  onClose,
  onAdd,
}: {
  open: boolean;
  title: string;
  described?: boolean;
  onClose: () => void;
  onAdd: (amount: number, description?: string) => void;
}) {
  const { t } = useLanguage();
  const symbol = useCurrencySymbol();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [negative, setNegative] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(open);
  if (open !== balanceOpen) {
    setBalanceOpen(open);
    if (open) {
      setDescription("");
      setAmount("");
      setNegative(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Math.round(Math.abs(Number(amount.replace(",", "."))) * 100) / 100;
    if ((described && !description.trim()) || !Number.isFinite(value) || value <= 0) return;
    onAdd(negative ? -value : value, description.trim());
    setDescription("");
    setAmount("");
    setNegative(false);
    onClose();
  }

  return (
    <AdminDialog open={open} closeButton title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {described ? (
          <label className="block text-sm">
            <span className="text-muted">{t("roster.balance.description")}</span>
            <input required value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} className={fieldClass} />
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="text-muted">{t("roster.balance.amount")}</span>
          <span className="mt-1 flex items-center rounded-lg bg-ice ring-1 ring-line focus-within:ring-train">
            <button
              type="button"
              aria-pressed={negative}
              aria-label={t("roster.balance.sign")}
              onClick={() => setNegative((current) => !current)}
              className={`grid w-11 shrink-0 place-items-center border-r border-line text-base font-semibold ${negative ? "bg-game-soft text-game" : "text-ink"}`}
            >
              ±
            </button>
            <input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onFocus={() => {
                if (/^0+([.,]0*)?$/.test(amount)) setAmount("");
              }}
              onChange={(event) => setAmount(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-ink outline-none placeholder:text-muted"
            />
            <span className="shrink-0 pr-3 text-muted">{symbol}</span>
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice">
            {t("actions.cancel")}
          </button>
          <button type="submit" className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
            {t("actions.add")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function MemberFace({ member, size }: { member: Member; size: "md" | "lg" }) {
  const photo = memberFaceUrl(member, useEntuziasti());
  const box = size === "lg" ? "h-14 w-14 text-sm" : "h-10 w-10 text-xs";
  if (photo) return <ContentImage src={photo} className={`${box} shrink-0 rounded-lg bg-ice object-contain object-center`} />;
  return <span className={`grid ${box} shrink-0 place-items-center rounded-lg bg-navy font-semibold text-white`}>{initials(member.name)}</span>;
}

function MemberPhoneRow({
  member,
  leader = false,
  groups,
  positions,
  finance = false,
  holds,
  onHolds,
  onAdjust,
}: {
  member: Member;
  leader?: boolean;
  groups: Subteam[];
  positions: ReturnType<typeof catalogForSport>;
  finance?: boolean;
  holds: BalanceHold[];
  onHolds: (holds: BalanceHold[]) => void;
  onAdjust?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex min-w-0 items-center gap-3 min-[600px]:hidden">
      <MemberFace member={member} size="lg" />
      <div className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          <span className="min-w-0 truncate font-medium">{member.name}</span>
          {leader ? <span className="shrink-0 rounded-full bg-ice px-2 py-0.5 text-xs font-medium text-muted">{t("team.leader")}</span> : null}
          {member.teamAdmin ? <span className="shrink-0 rounded-full bg-ice px-2 py-0.5 text-xs font-medium text-muted">{t("roles.admin")}</span> : null}
          {member.feeExempt ? (
            <span className="shrink-0" onClick={(event) => event.stopPropagation()}>
              <IconTipButton label={t("roster.fee_exempt.tip")} tone="muted" compact>
                <IconNoFee />
              </IconTipButton>
            </span>
          ) : null}
        </span>
        <PlayerContact email={member.email} phone={member.phone} />
        <MemberMetaLine member={member} groups={groups} positions={positions} finance={finance} holds={holds} onHolds={onHolds} onAdjust={onAdjust} />
      </div>
    </div>
  );
}

function MemberMetaLine({
  member,
  groups,
  positions,
  finance,
  holds,
  onHolds,
  onAdjust,
}: {
  member: Member;
  groups: Subteam[];
  positions: ReturnType<typeof catalogForSport>;
  finance: boolean;
  holds: BalanceHold[];
  onHolds: (holds: BalanceHold[]) => void;
  onAdjust?: () => void;
}) {
  return (
    <span className="mt-1 flex max-h-6 min-w-0 flex-wrap content-start items-center gap-x-1.5 gap-y-3 overflow-hidden">
      {finance ? (
        <span className="shrink-0" onClick={(event) => event.stopPropagation()}>
          <MemberBalance member={member} holds={holds} onHolds={onHolds} onAdjust={onAdjust} inline />
        </span>
      ) : null}
      <MemberMark member={member} groups={groups} positions={positions} line leadingSep={finance} />
    </span>
  );
}

function MetaSep() {
  return (
    <span aria-hidden className="shrink-0 text-muted">
      •
    </span>
  );
}

function MemberIdentity({ member, leader = false }: { member: Member; leader?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="max-[599px]:hidden">
        <MemberFace member={member} size="md" />
      </span>
      <span className="min-w-0 leading-5">
        <span className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="truncate font-medium">{member.name}</span>
          {leader ? <span className="shrink-0 rounded-full bg-ice px-2 py-0.5 text-xs font-medium text-muted">{t("team.leader")}</span> : null}
          {member.teamAdmin ? <span className="shrink-0 rounded-full bg-ice px-2 py-0.5 text-xs font-medium text-muted">{t("roles.admin")}</span> : null}
          {member.feeExempt ? (
            <span onClick={(event) => event.stopPropagation()}>
              <IconTipButton label={t("roster.fee_exempt.tip")} tone="muted" compact>
                <IconNoFee />
              </IconTipButton>
            </span>
          ) : null}
        </span>
        <PlayerContact email={member.email} phone={member.phone} />
      </span>
    </div>
  );
}

function PositionChip({ code, positions }: { code: string; positions: ReturnType<typeof catalogForSport> }) {
  const { t, lang, languages } = useLanguage();
  const fallbackLang = languages.find((language) => language.isDefault)?.code ?? lang;
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const shown = formatPosition(code, positions, lang, fallbackLang, t);
  const label = shown.code;
  const name = shown.name;

  function place(target: HTMLElement) {
    const box = target.getBoundingClientRect();
    setTip({ x: box.left + box.width / 2, y: box.top - 6 });
  }

  return (
    <>
      <span
        aria-label={name}
        className="shrink-0 rounded-lg bg-ice px-2 py-1 text-xs font-semibold"
        onMouseEnter={(event) => place(event.currentTarget)}
        onMouseLeave={() => setTip(null)}
      >
        {label}
      </span>
      {tip ? (
        <span
          role="tooltip"
          style={{ left: tip.x, top: tip.y, transform: "translate(-50%, -100%)" }}
          className="pointer-events-none fixed z-40 rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
        >
          {name}
        </span>
      ) : null}
    </>
  );
}

function MemberMark({
  member,
  groups,
  positions,
  row = false,
  line = false,
  leadingSep = false,
}: {
  member: Member;
  groups: Subteam[];
  positions: ReturnType<typeof catalogForSport>;
  row?: boolean;
  line?: boolean;
  leadingSep?: boolean;
}) {
  const { subteamById } = useTeamCatalog();
  const ids = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
  const marks = ids.map((id) => groups?.find((item) => item.id === id) ?? subteamById(id)).filter((item): item is Subteam => Boolean(item));
  const jersey = formatJersey(member.number);
  const codes = [member.position, ...(member.extraPositions ?? [])].map((code) => code.trim()).filter(Boolean);
  if (!jersey && codes.length === 0 && marks.length === 0) return null;
  if (line) {
    const pieces: { key: string; node: ReactNode }[] = [];
    if (jersey) pieces.push({ key: "number", node: <span className="text-sm font-semibold tabular-nums">{jersey}</span> });
    for (const code of codes) pieces.push({ key: code, node: <PositionChip code={code} positions={positions} /> });
    for (const subteam of marks) pieces.push({ key: subteam.id, node: <SubteamSwatch color={subteam.color} name={subteam.name} /> });
    return (
      <>
        {pieces.map((piece, index) => (
          <span key={piece.key} className="inline-flex shrink-0 items-center gap-1.5">
            {leadingSep || index > 0 ? <MetaSep /> : null}
            {piece.node}
          </span>
        ))}
      </>
    );
  }
  return (
    <span className={row ? "flex flex-col items-start gap-1.5 min-[600px]:flex-row min-[600px]:flex-wrap min-[600px]:items-center" : "inline-flex w-max flex-col items-center gap-1.5"}>
      {jersey ? <span className="text-sm font-semibold tabular-nums">{jersey}</span> : null}
      {codes.length ? (
        <span className="inline-flex w-max flex-nowrap items-center justify-center gap-1">
          {codes.map((code) => (
            <PositionChip key={code} code={code} positions={positions} />
          ))}
        </span>
      ) : null}
      {marks.length ? (
        <span className="flex flex-row flex-wrap justify-center gap-1">
          {marks.map((subteam) => (
            <SubteamSwatch key={subteam.id} color={subteam.color} name={subteam.name} />
          ))}
        </span>
      ) : null}
    </span>
  );
}

function SubteamSwatch({ color, name }: { color: string; name: string }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  function place(target: HTMLElement) {
    const box = target.getBoundingClientRect();
    setTip({ x: box.left + box.width / 2, y: box.top - 6 });
  }

  return (
    <>
      <span
        aria-label={name}
        className="block h-4 w-4 shrink-0 rounded-md"
        style={{ background: color }}
        onMouseEnter={(event) => place(event.currentTarget)}
        onMouseLeave={() => setTip(null)}
      />
      {tip ? (
        <span
          role="tooltip"
          style={{ left: tip.x, top: tip.y, transform: "translate(-50%, -100%)" }}
          className="pointer-events-none fixed z-40 rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
        >
          {name}
        </span>
      ) : null}
    </>
  );
}

function MemberBalance({
  member,
  holds,
  onHolds,
  onAdjust,
  inline = false,
}: {
  member: Member;
  holds: BalanceHold[];
  onHolds: (holds: BalanceHold[]) => void;
  onAdjust?: () => void;
  inline?: boolean;
}) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const reserved = Math.round(holds.reduce((sum, hold) => sum + hold.amount, 0) * 100) / 100;
  const figure = onAdjust ? (
    <button type="button" onClick={onAdjust} className={`font-medium tabular-nums hover:underline ${member.balance < 0 ? "text-game" : "text-ink"}`}>
      {formatMoney(member.balance)}
    </button>
  ) : (
    <span className={`font-medium tabular-nums ${member.balance < 0 ? "text-game" : "text-ink"}`}>{formatMoney(member.balance)}</span>
  );
  return (
    <div className={inline ? "inline-flex shrink-0 items-baseline gap-1" : undefined}>
      {figure}
      {reserved > 0 ? (
        <button
          type="button"
          onClick={() => onHolds(holds)}
          aria-label={t("finance.reserved", { amount: formatMoney(reserved) })}
          className={inline ? "text-xs text-muted tabular-nums hover:underline" : "mt-0.5 block text-xs text-muted tabular-nums hover:underline"}
        >
          ({formatMoney(reserved)})
        </button>
      ) : null}
    </div>
  );
}

export function HoldDialog({ holds, onClose }: { holds: BalanceHold[] | null; onClose: () => void }) {
  const { t } = useLanguage();
  const rows = holds ?? [];
  const items = rows.map((hold) => {
    const about = t("finance.hold.about", { what: hold.what });
    return {
      id: hold.id,
      title: hold.where ? `${about} · ${hold.where}` : about,
      when: hold.when,
      amount: hold.amount,
    };
  });
  return (
    <AdminDialog open={holds !== null} title={t("finance.hold.title")} onClose={onClose}>
      <BalanceHistory items={items} empty={t("player.ledger.empty")} tone="due" />
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg bg-ice px-4 py-2 text-sm font-medium">
          {t("event.close")}
        </button>
      </div>
    </AdminDialog>
  );
}

function MemberDates({ member }: { member: Member }) {
  const { formatDate, formatDateTime, formatRelative } = useDisplayFormat();
  return (
    <div>
      <span className="block tabular-nums" title={formatDateTime(member.updatedAt)}>
        {formatRelative(member.updatedAt)}
      </span>
      <span className="block text-xs text-muted tabular-nums">{formatDate(member.joined)}</span>
    </div>
  );
}

function MemberActions({ onEdit, onRemove }: { onEdit?: () => void; onRemove?: () => void }) {
  const { t } = useLanguage();
  if (!onEdit && !onRemove) return null;
  return (
    <div className="flex gap-1">
      {onEdit ? (
        <IconTipButton label={t("roster.edit")} tone="train" onClick={onEdit}>
          <IconPencil />
        </IconTipButton>
      ) : null}
      {onRemove ? (
        <IconTipButton label={t("roster.remove")} tone="game" onClick={onRemove}>
          <IconTrash />
        </IconTipButton>
      ) : null}
    </div>
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

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.75" />
    </svg>
  );
}

function IconQr() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zM13 3h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zM13 13h2v2h-2v-2zm4 0h4v2h-2v2h-2v-2h2v-2zm-4 4h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
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

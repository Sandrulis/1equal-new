"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { MemberEditDialog } from "@/app/components/member-edit-dialog";
import { TeamMark } from "@/app/components/team-mark";
import { formatJersey, MEMBERS, type Member, type Subteam } from "@/app/lib/demo-data";
import { adjustMemberBalance, removeOwnedMember, updateOwnedTeam } from "@/app/lib/team-actions";
import { PlayerProfile } from "@/app/components/player-profile";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { MoneyVotingFields } from "@/app/components/money-voting-fields";
import { useCurrencySymbol, useFormatMoney } from "@/app/components/currency-provider";
import { toLocalDateTimeStamp } from "@/app/lib/format";
import { useSiteBrand } from "@/app/components/site-brand-provider";
import { votingHours } from "@/app/lib/team-defaults";
import { IconPencil, IconTipButton, IconTrash, IconX } from "@/app/components/icon-tip-button";
import { clearInviteBannerDismissed, readInviteBannerDismissed, writeInviteBannerDismissed } from "@/app/lib/invite-banner-cookie";
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

function memberCountKey(count: number): MessageKey {
  return count === 1 ? "members.count.one" : "members.count";
}

type TeamEntry = {
  id: string;
  description: string;
  amount: number;
  at: string;
};

export function TeamRoster({
  teamName,
  inviteCode,
  sourceUrl = null,
  logoUrl = null,
  initialMembers = MEMBERS,
  teamId = null,
  leaderId = null,
  accountId = null,
  trainingVotingHours = 24,
  gameVotingHours = 72,
  currency = null,
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
}: {
  teamName: string;
  inviteCode: string;
  sourceUrl?: string | null;
  logoUrl?: string | null;
  initialMembers?: Member[];
  teamId?: string | null;
  leaderId?: string | null;
  accountId?: string | null;
  trainingVotingHours?: number;
  gameVotingHours?: number;
  currency?: string | null;
  onTeamSaved?: (team: { name: string; currency: string | null; trainingVotingHours: number; gameVotingHours: number }) => void;
  subteams?: Subteam[];
  memberId: string | null;
  onOpenMember: (id: string) => void;
  onCloseMember: () => void;
  onMemberSaved?: (member: Member, teamCode: string) => void;
  onMemberRemoved?: (id: string) => void;
  finance?: boolean;
  persistedBalance?: number;
  persistedEntries?: TeamEntry[];
}) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const { showFeedback } = useFeedbackToast();
  const { subteamById, subteams: catalogSubteams } = useTeamCatalog();
  const groupList = subteams ?? catalogSubteams;
  function groupById(id: string): Subteam | undefined {
    return groupList.find((item) => item.id === id) ?? subteamById(id);
  }
  const [inviteVisible, setInviteVisible] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [editing, setEditing] = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);
  const [balancing, setBalancing] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [teamEntries, setTeamEntries] = useState<TeamEntry[]>([]);
  const [adjusting, setAdjusting] = useState<Member | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canAdjust = Boolean(teamId && leaderId && accountId && leaderId === accountId);
  const teamBalance = Math.round((persistedBalance + teamEntries.reduce((sum, entry) => sum + entry.amount, 0)) * 100) / 100;
  const statementEntries = [...persistedEntries, ...teamEntries].sort((a, b) => b.at.localeCompare(a.at));
  const player = memberId ? members.find((member) => member.id === memberId) : undefined;

  useEffect(() => {
    setInviteVisible(!readInviteBannerDismissed(inviteCode));
  }, [inviteCode]);

  function openPlayer(id: string) {
    onOpenMember(id);
    window.scrollTo({ top: 0 });
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) => {
      const ids = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
      const subteam = ids.map((id) => groupById(id)?.name ?? "").join(" ");
      return [member.name, member.email, member.phone, formatJersey(member.number) ?? "", member.position, subteam]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [groupList, members, query, subteamById, t]);

  async function removeMember(id: string) {
    if (teamId) {
      const result = await removeOwnedMember(teamId, id);
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      showFeedback({ message: t("roster.removed"), variant: "success" });
    }
    setMembers((current) => current.filter((item) => item.id !== id));
    onMemberRemoved?.(id);
  }

  async function saveAdjustment(member: Member, amount: number) {
    if (!teamId) return;
    const result = await adjustMemberBalance({ teamId, userId: member.id, amount });
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    const next = { ...member, balance: result.balance, ledger: result.ledger };
    setMembers((current) => current.map((item) => (item.id === member.id ? next : item)));
    onMemberSaved?.(next, inviteCode);
    setAdjusting(null);
    showFeedback({ message: t("roster.balance.saved"), variant: "success" });
  }

  if (player) {
    return (
      <div>
        <div className="mb-5">
          <button type="button" onClick={onCloseMember} className="inline-flex items-center gap-1.5 text-sm font-medium text-train">
            <ChevronLeft />
            {t("player.back")}
          </button>
        </div>
        <PlayerProfile member={player} subteams={groupList} finance={finance} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <TeamMark name={teamName} logoUrl={logoUrl} textClassName="text-lg" className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{teamName}</h1>
              {canAdjust && teamId ? (
                <IconTipButton label={t("actions.edit")} tone="muted" onClick={() => setSettingsOpen(true)}>
                  <IconPencil />
                </IconTipButton>
              ) : null}
            </div>
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block max-w-full truncate text-sm text-train">
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
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setStatementOpen(true)} className="rounded-lg px-2 py-1 text-right hover:bg-paper">
              <span className="block text-xs text-muted">{t("roster.balance.team")}</span>
              <span className={`block text-lg font-semibold tabular-nums ${teamBalance < 0 ? "text-game" : "text-ink"}`}>{formatMoney(teamBalance)}</span>
            </button>
            {canAdjust ? (
              <button type="button" onClick={() => setBalancing(true)} className="shrink-0 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
                {t("roster.balance.add")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {inviteVisible ? (
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
              setInviteVisible(false);
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted ring-1 ring-line hover:bg-ice hover:text-ink"
          >
            <IconX />
          </button>
        </div>
      </div>
      ) : null}

      <div className="mb-4 flex items-center gap-2">
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
        <button type="button" onClick={() => setInviting(true)} className="h-9 shrink-0 rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy/90">
          {t("roster.invite")}
        </button>
        {inviteVisible === false ? (
          <button
            type="button"
            aria-label={t("team.invite.show")}
            onClick={() => {
              clearInviteBannerDismissed(inviteCode);
              setInviteVisible(true);
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
                {finance ? <th className="px-4 py-3 font-medium">{t("roster.balance")}</th> : null}
                <th className="hidden px-4 py-3 font-medium min-[900px]:table-cell">{t("roster.joined")}</th>
                <th className="px-4 py-3 font-medium">{t("roster.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={finance ? 5 : 4} className="px-4 py-8 text-muted">
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
                      <td className="w-full max-w-0 px-4 py-3">
                        <MemberIdentity member={member} />
                      </td>
                      <td className="hidden px-4 py-3 text-center min-[768px]:table-cell">
                        <MemberMark member={member} groups={groupList} />
                      </td>
                      {finance ? (
                        <td className="px-4 py-3 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                          {canAdjust ? (
                            <button type="button" onClick={() => setAdjusting(member)} className={`font-medium tabular-nums hover:underline ${member.balance < 0 ? "text-game" : "text-ink"}`}>
                              {formatMoney(member.balance)}
                            </button>
                          ) : (
                            <MemberBalance member={member} />
                          )}
                        </td>
                      ) : null}
                      <td className="hidden px-4 py-3 min-[900px]:table-cell">
                        <MemberDates member={member} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                        <MemberActions
                          memberId={member.id}
                          onEdit={() => setEditing(member)}
                          onRemove={(id) => void removeMember(id)}
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {editing ? (
        <MemberEditDialog
          member={editing}
          teamId={teamId}
          remote={Boolean(teamId)}
          subteams={groupList}
          onClose={() => setEditing(null)}
          onSaved={(member, teamCode) => {
            setMembers((current) => current.map((item) => (item.id === member.id ? member : item)));
            if (teamCode) onMemberSaved?.(member, teamCode);
          }}
        />
      ) : null}
      <InvitePlayerDialog
        open={inviting}
        onClose={() => setInviting(false)}
        onDone={() => showFeedback({ message: t("roster.invite.saved"), variant: "success" })}
      />
      {teamId ? (
        <TeamSettingsDialog
          open={settingsOpen}
          name={teamName}
          currency={currency}
          trainingHours={trainingVotingHours}
          gameHours={gameVotingHours}
          onClose={() => setSettingsOpen(false)}
          onSave={async (next) => {
            const result = await updateOwnedTeam({ teamId, ...next });
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
      <TeamStatementDialog open={statementOpen} entries={statementEntries} onClose={() => setStatementOpen(false)} />
      <BalanceDialog
        open={adjusting !== null}
        title={t("roster.balance.adjust")}
        onClose={() => setAdjusting(null)}
        onAdd={(amount) => {
          if (adjusting) void saveAdjustment(adjusting, amount);
        }}
      />
    </div>
  );
}

const fieldClass = "mt-1 w-full rounded-lg bg-ice px-3 py-2 text-ink ring-1 ring-line outline-none focus:ring-train";

function InvitePlayerDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) setEmail("");
  }, [open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setEmail("");
    onDone();
    onClose();
  }

  return (
    <AdminDialog open={open} title={t("roster.invite.title")} lead={t("roster.invite.lead")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted">{t("common.email")}</span>
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={fieldClass} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice">
            {t("actions.cancel")}
          </button>
          <button type="submit" className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
            {t("roster.invite")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function signedMoney(amount: number, format: (value: number) => string): string {
  return amount > 0 ? `+${format(amount)}` : format(amount);
}

function TeamStatementDialog({ open, entries, onClose }: { open: boolean; entries: TeamEntry[]; onClose: () => void }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const { formatDateTime } = useDisplayFormat();
  const total = Math.round(entries.reduce((sum, entry) => sum + entry.amount, 0) * 100) / 100;

  return (
    <AdminDialog open={open} title={t("roster.balance.statement")} onClose={onClose}>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">{t("roster.balance.statement.empty")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((entry) => {
            return (
              <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{entry.description}</p>
                  <p className="text-sm text-muted">
                    {formatDateTime(entry.at)}
                  </p>
                </div>
                <p className={`shrink-0 font-medium tabular-nums ${entry.amount < 0 ? "text-game" : "text-train"}`}>{signedMoney(entry.amount, formatMoney)}</p>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="font-semibold">{t("player.total")}</span>
        <span className={`font-semibold tabular-nums ${total < 0 ? "text-game" : "text-ink"}`}>{formatMoney(total)}</span>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg bg-ice px-4 py-2 text-sm font-medium">
          {t("event.close")}
        </button>
      </div>
    </AdminDialog>
  );
}

function TeamSettingsDialog({
  open,
  name,
  currency,
  trainingHours,
  gameHours,
  onClose,
  onSave,
}: {
  open: boolean;
  name: string;
  currency: string | null;
  trainingHours: number;
  gameHours: number;
  onClose: () => void;
  onSave: (next: { name: string; currency: string | null; trainingVotingHours: number; gameVotingHours: number }) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const brand = useSiteBrand();
  const [draftName, setDraftName] = useState(name);
  const [draftCurrency, setDraftCurrency] = useState(currency);
  const [training, setTraining] = useState(String(trainingHours));
  const [game, setGame] = useState(String(gameHours));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftName(name);
    setDraftCurrency(currency);
    setTraining(String(trainingHours));
    setGame(String(gameHours));
    setPending(false);
  }, [open, name, currency, trainingHours, gameHours]);

  const trainingValue = votingHours(training);
  const gameValue = votingHours(game);
  const hoursOk = trainingValue != null && gameValue != null;
  const dirty = draftName.trim() !== name || draftCurrency !== currency || trainingValue !== trainingHours || gameValue !== gameHours;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draftName.trim() || !hoursOk || trainingValue == null || gameValue == null || !dirty || pending) return;
    setPending(true);
    const saved = await onSave({ name: draftName.trim(), currency: draftCurrency, trainingVotingHours: trainingValue, gameVotingHours: gameValue });
    setPending(false);
    if (saved) onClose();
  }

  return (
    <AdminDialog open={open} title={t("team.settings.title")} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block text-sm">
          <span className="text-muted">{t("team.settings.name")}</span>
          <input required value={draftName} maxLength={80} onChange={(event) => setDraftName(event.target.value)} className={fieldClass} />
        </label>
        <MoneyVotingFields
          idPrefix="team-settings"
          currency={draftCurrency}
          trainingHours={training}
          gameHours={game}
          systemCurrency={brand.currency}
          allowSystemCurrency
          disabled={pending}
          onCurrency={setDraftCurrency}
          onTrainingHours={setTraining}
          onGameHours={setGame}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={!dirty || !hoursOk || pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {t("actions.save")}
          </button>
        </div>
      </form>
    </AdminDialog>
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

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setAmount("");
    setNegative(false);
  }, [open]);

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
    <AdminDialog open={open} title={title} onClose={onClose}>
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

function MemberIdentity({ member }: { member: Member }) {
  const { t } = useLanguage();
  return (
    <div className="flex min-w-0 items-center gap-3">
      {member.photoUrl ? (
        <img src={member.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-ice object-contain object-center" />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-xs font-semibold text-white">{initials(member.name)}</span>
      )}
      <span className="min-w-0 leading-5">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate font-medium">{member.name}</span>
          {member.feeExempt ? (
            <span onClick={(event) => event.stopPropagation()}>
              <IconTipButton label={t("roster.fee_exempt.tip")} tone="muted" compact>
                <IconNoFee />
              </IconTipButton>
            </span>
          ) : null}
        </span>
        {member.email ? <span className="block truncate text-sm text-muted">{member.email}</span> : null}
        {member.phone ? <span className="block truncate text-sm text-muted">{member.phone}</span> : null}
      </span>
    </div>
  );
}

function MemberMark({ member, groups }: { member: Member; groups: Subteam[] }) {
  const { subteamById } = useTeamCatalog();
  const ids = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
  const marks = ids.map((id) => groups?.find((item) => item.id === id) ?? subteamById(id)).filter((item): item is Subteam => Boolean(item));
  const jersey = formatJersey(member.number);
  if (!jersey && !member.position && marks.length === 0) return null;
  return (
    <span className="flex flex-col items-center gap-1.5">
      {jersey ? <span className="text-sm font-semibold tabular-nums">{jersey}</span> : null}
      {member.position ? <span className="rounded-lg bg-ice px-2.5 py-1 text-xs font-semibold">{member.position}</span> : null}
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
        className="block h-4 w-4 rounded-md"
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

function MemberBalance({ member }: { member: Member }) {
  const formatMoney = useFormatMoney();
  return (
    <span className={`font-medium tabular-nums ${member.balance < 0 ? "text-game" : "text-ink"}`}>
      {formatMoney(member.balance)}
    </span>
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

function MemberActions({ memberId, onEdit, onRemove }: { memberId: string; onEdit: () => void; onRemove: (id: string) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-1">
      <IconTipButton label={t("roster.edit")} tone="train" onClick={onEdit}>
        <IconPencil />
      </IconTipButton>
      <IconTipButton label={t("roster.remove")} tone="game" onClick={() => onRemove(memberId)}>
        <IconTrash />
      </IconTipButton>
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

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
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

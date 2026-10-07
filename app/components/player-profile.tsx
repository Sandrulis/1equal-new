"use client";

import { useEffect, useState } from "react";
import { ContentImage } from "@/app/components/content-image";
import { EhlPlayerColumns } from "@/app/components/ehl-player-preview";
import { AdminDialog } from "@/app/components/admin-dialog";
import { BalanceHistory, BalanceRangeFields, useBalanceRange, type BalanceHistoryItem } from "@/app/components/balance-history";
import type { BalanceEntry, Member, PlayerCharge, Subteam } from "@/app/lib/demo-data";
import { formatJersey } from "@/app/lib/format-jersey";
import type { EhlPlayerProfile } from "@/app/lib/ehl-player";
import { useFormatMoney } from "@/app/components/currency-provider";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { formatPosition, type PositionCatalogItem } from "@/app/lib/positions";
import { useTeamCatalog } from "@/app/lib/team-catalog";
import { memberFaceUrl } from "@/app/lib/entuziasti-view";
import { useEntuziasti } from "@/app/components/entuziasti-context";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function roleKey(role: Member["role"]): MessageKey {
  return `role.${role}` as MessageKey;
}

export function PlayerProfile({ member, subteams, positions = [], finance = true, leader = false, embedded = false, teamId = null }: { member: Member; subteams?: Subteam[]; positions?: PositionCatalogItem[]; finance?: boolean; leader?: boolean; embedded?: boolean; teamId?: string | null }) {
  const { t, lang, languages } = useLanguage();
  const fallbackLang = languages.find((language) => language.isDefault)?.code ?? lang;
  const { subteamById } = useTeamCatalog();
  const ids = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
  const groups = ids.map((id) => subteams?.find((item) => item.id === id) ?? subteamById(id)).filter((item): item is Subteam => Boolean(item));
  const entuziasti = useEntuziasti();
  const photo = memberFaceUrl(member, entuziasti);
  const jersey = formatJersey(member.number);
  const memberPositions = [member.position, ...(member.extraPositions ?? [])].map((code) => code.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
        <div className="flex items-start gap-4">
          {photo ? (
            <ContentImage src={photo} className="h-16 w-16 shrink-0 rounded-lg bg-ice object-contain object-center" />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-navy text-xl font-semibold text-white">{initials(member.name)}</span>
          )}
          <div className="min-w-0">
            {embedded ? null : <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>}
            <p className="truncate text-sm leading-5 text-muted">{member.email}</p>
            {member.phone ? <p className="truncate text-sm leading-5 text-muted">{member.phone}</p> : null}
            <p className="mt-2 flex flex-wrap gap-1.5">
              {leader ? <span className="inline-flex rounded-full bg-ice px-2.5 py-0.5 text-xs font-medium text-muted">{t("team.leader")}</span> : null}
              {member.teamAdmin ? <span className="inline-flex rounded-full bg-ice px-2.5 py-0.5 text-xs font-medium text-muted">{t("roles.admin")}</span> : null}
              <span className="inline-flex rounded-full bg-ice px-2.5 py-0.5 text-xs font-medium text-muted">{t(roleKey(member.role))}</span>
            </p>
          </div>
        </div>
        {jersey || memberPositions.length || groups.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {memberPositions.length || jersey ? (
              <div className={`rounded-xl bg-ice px-4 py-3 ${groups.length ? "" : "sm:col-span-2"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("roster.fields.position")}</p>
                  {jersey ? <p className="text-lg leading-none font-semibold text-train tabular-nums">{jersey}</p> : null}
                </div>
                {memberPositions.length ? (
                  <ul className="mt-1 space-y-1">
                    {memberPositions.map((code, index) => (
                      <li key={code} className={`text-sm font-semibold ${index === 0 ? "text-train" : ""}`}>
                        {formatPosition(code, positions, lang, fallbackLang, t).label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {groups.length ? (
              <div className="rounded-xl bg-ice px-4 py-3">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("player.subteams")}</p>
                <ul className="mt-2 space-y-1.5">
                  {groups.map((subteam) => (
                    <li key={subteam.id} className="flex items-center gap-2 text-sm font-medium">
                      <span className="h-4 w-4 rounded-md" style={{ background: subteam.color }} />
                      {subteam.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {entuziasti && member.ehl ? <PlayerEhl profile={member.ehl} /> : null}

      {finance ? (
        <section className="rounded-2xl bg-paper ring-1 ring-line">
          <h2 className="px-4 pt-4 text-lg font-semibold sm:px-5">{t("player.log")}</h2>
          <PlayerBalanceLog member={member} teamId={teamId} inset />
        </section>
      ) : null}
    </div>
  );
}

export function PlayerBalanceDialog({ member, teamId = null, reserved = 0, onClose }: { member: Member; teamId?: string | null; reserved?: number; onClose: () => void }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  return (
    <AdminDialog open title={t("player.log")} onClose={onClose} closeButton>
      {reserved > 0 ? <p className="px-4 text-sm font-medium text-train sm:px-5">{t("finance.reserved", { amount: formatMoney(reserved) })}</p> : null}
      <PlayerBalanceLog member={member} teamId={teamId} />
    </AdminDialog>
  );
}

export function PlayerBalanceLog({ member, teamId = null, inset = false }: { member: Member; teamId?: string | null; inset?: boolean }) {
  const { t } = useLanguage();
  const { formatDate, formatTime, formatDateTime } = useDisplayFormat();
  const range = useBalanceRange();
  const pad = inset ? "px-4 sm:px-5" : "";
  const [remote, setRemote] = useState<BalanceEntry[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = `${teamId ?? ""}:${member.id}:${range.from}:${range.to}:${member.balance}`;
  const pending = Boolean(teamId && range.allowed && loadedKey !== requestKey);
  const [demoCharges, setDemoCharges] = useState<PlayerCharge[]>([]);
  useEffect(() => {
    if (!teamId || !range.allowed) return;
    let active = true;
    void fetch(`/api/teams/${teamId}/ledger?userId=${encodeURIComponent(member.id)}&from=${range.from}&to=${range.to}`)
      .then(async (response) => (response.ok ? ((await response.json()) as { ok?: boolean; entries?: BalanceEntry[] }) : null))
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
  }, [requestKey, range.allowed, range.from, range.to, teamId, member.id]);
  useEffect(() => {
    if (teamId || member.feeExempt) return;
    let active = true;
    void import("@/app/lib/demo-data").then((mod) => {
      if (!active) return;
      setDemoCharges(
        mod.chargesForMember(member.id).map((charge) => ({
          ...charge,
          venueName: charge.venueName ?? (charge.venueId ? mod.venueById(charge.venueId).name : undefined),
        })),
      );
    });
    return () => {
      active = false;
    };
  }, [member.feeExempt, member.id, teamId]);
  const charges = teamId
    ? ledgerCharges(member.id, remote ?? [])
    : member.feeExempt
      ? []
      : demoCharges.filter((charge) => charge.date >= range.from && charge.date <= range.to);
  const items = charges.map((charge) => historyItem(charge, t, formatDate, formatTime, formatDateTime));
  return (
    <div className={pad}>
      <BalanceRangeFields from={range.from} to={range.to} onChange={range.setRange} />
      {range.allowed ? null : <p className="py-8 text-sm text-muted">{t("balance.range.long")}</p>}
      {!range.allowed ? null : pending ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted" role="status">
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-navy" aria-hidden="true" />
          {t("player.ledger.loading")}
        </div>
      ) : (
        <BalanceHistory items={items} empty={t(teamId ? "player.ledger.empty" : "player.empty")} />
      )}
    </div>
  );
}

function PlayerEhl({ profile }: { profile: EhlPlayerProfile }) {
  const { t } = useLanguage();

  return (
    <section className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
      <h2 className="text-lg font-semibold">{t("player.ehl.title")}</h2>
      {profile.team ? <p className="mt-1 text-sm text-muted">{profile.team}</p> : null}
      <div className="mt-4">
        <EhlPlayerColumns profile={profile} />
      </div>
    </section>
  );
}

function ledgerCharges(memberId: string, entries: BalanceEntry[]): PlayerCharge[] {
  return entries.map((entry) => {
    const [date, time = ""] = entry.at.split("T");
    const kind = entry.kind === "event" ? "event" : "manual";
    return {
      id: entry.id,
      memberId,
      date: entry.eventDate || date,
      time: entry.eventStart || time.slice(0, 5),
      amount: entry.amount,
      kind,
      type: entry.eventType ?? undefined,
      venueName: entry.venueName ?? undefined,
      recordedAt: entry.at,
    };
  });
}

function historyItem(
  charge: PlayerCharge,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
  formatDate: (value: string) => string,
  formatTime: (value: string) => string,
  formatDateTime: (value: string) => string,
): BalanceHistoryItem {
  const facts = chargeFacts(charge, t);
  const about = charge.type ? t("team.ledger.event", { type: facts.type, date: formatDate(charge.date) }) : facts.action;
  const title = charge.type && facts.place !== "—" ? `${about} · ${facts.place}` : about;
  const stamp = charge.recordedAt
    ? formatDateTime(charge.recordedAt)
    : [formatDate(charge.date), charge.time ? formatTime(charge.time) : ""].filter(Boolean).join(" ");
  const when = charge.type ? `${stamp} · ${facts.action}` : stamp;
  return { id: charge.id, title, when, amount: charge.amount };
}

function chargeFacts(
  charge: PlayerCharge,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): { type: string; place: string; action: string } {
  const type = charge.type ? t(charge.type === "game" ? "legend.game" : "legend.training") : "—";
  const named = charge.venueName?.trim() || "";
  const action = charge.kind === "manual" ? t("player.manual") : charge.kind === "payment" ? t("player.deposit") : t("player.source.system");
  return { type, place: named || "—", action };
}

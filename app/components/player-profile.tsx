"use client";

import { ContentImage } from "@/app/components/content-image";
import { AdminDialog } from "@/app/components/admin-dialog";
import { BalanceHistory, type BalanceHistoryItem } from "@/app/components/balance-history";
import { chargesForMember, formatJersey, venueById, type Member, type PlayerCharge, type Subteam } from "@/app/lib/demo-data";
import type { EhlPlayerProfile } from "@/app/lib/ehl-player";
import { useFormatMoney } from "@/app/components/currency-provider";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { positionLabel } from "@/app/lib/positions";
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

export function PlayerProfile({ member, subteams, finance = true, leader = false, embedded = false }: { member: Member; subteams?: Subteam[]; finance?: boolean; leader?: boolean; embedded?: boolean }) {
  const { t } = useLanguage();
  const { subteamById } = useTeamCatalog();
  const ids = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
  const groups = ids.map((id) => subteams?.find((item) => item.id === id) ?? subteamById(id)).filter((item): item is Subteam => Boolean(item));
  const entuziasti = useEntuziasti();
  const photo = memberFaceUrl(member, entuziasti);
  const jersey = formatJersey(member.number);
  const positions = [member.position, ...(member.extraPositions ?? [])].map((code) => code.trim()).filter(Boolean);

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
        {jersey || positions.length || groups.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {positions.length || jersey ? (
              <div className={`rounded-xl bg-ice px-4 py-3 ${groups.length ? "" : "sm:col-span-2"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("roster.fields.position")}</p>
                  {jersey ? <p className="text-lg leading-none font-semibold text-train tabular-nums">{jersey}</p> : null}
                </div>
                {positions.length ? (
                  <ul className="mt-1 space-y-1">
                    {positions.map((code, index) => (
                      <li key={code} className={`text-sm font-semibold ${index === 0 ? "text-train" : ""}`}>
                        {positionLabel(code, t)}
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
          <PlayerBalanceLog member={member} inset />
        </section>
      ) : null}
    </div>
  );
}

export function PlayerBalanceDialog({ member, reserved = 0, onClose }: { member: Member; reserved?: number; onClose: () => void }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  return (
    <AdminDialog open title={t("player.log")} onClose={onClose} closeButton>
      {reserved > 0 ? <p className="px-4 text-sm font-medium text-train sm:px-5">{t("finance.reserved", { amount: formatMoney(reserved) })}</p> : null}
      <PlayerBalanceLog member={member} />
    </AdminDialog>
  );
}

export function PlayerBalanceLog({ member, inset = false }: { member: Member; inset?: boolean }) {
  const { t } = useLanguage();
  const { formatDate, formatTime, formatDateTime } = useDisplayFormat();
  const usingLedger = member.ledger != null;
  const charges = usingLedger ? ledgerCharges(member) : member.feeExempt ? [] : chargesForMember(member.id);
  const items = charges.map((charge) => historyItem(charge, t, formatDate, formatTime, formatDateTime));
  return <BalanceHistory items={items} empty={t(usingLedger ? "player.ledger.empty" : "player.empty")} inset={inset} />;
}

function PlayerEhl({ profile }: { profile: EhlPlayerProfile }) {
  const { t } = useLanguage();
  const facts = [
    ["player.ehl.height", profile.height],
    ["player.ehl.weight", profile.weight],
    ["player.ehl.stick", profile.stick],
    ["player.ehl.birth", profile.birthDate],
    ["player.ehl.country", profile.country],
  ].filter((item): item is [MessageKey, string] => Boolean(item[1]));
  const season = profile.season;
  const stats = season ? season.columns.filter((column) => season.results[column]).slice(0, 8) : [];

  return (
    <section className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
      <h2 className="text-lg font-semibold">{t("player.ehl.title")}</h2>
      {profile.team ? <p className="mt-1 text-sm text-muted">{profile.team}</p> : null}
      {facts.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {facts.map(([key, value]) => (
            <div key={key} className="rounded-xl bg-ice px-4 py-3">
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">{t(key)}</dt>
              <dd className="mt-1 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {season && stats.length ? (
        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{season.label || t("player.ehl.season")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {stats.map((column) => (
              <li key={column} className="rounded-lg bg-ice px-3 py-2 text-sm">
                <span className="text-muted">{column}</span> <span className="font-semibold tabular-nums">{season.results[column]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ledgerCharges(member: Member): PlayerCharge[] {
  return (member.ledger ?? []).map((entry) => {
    const [date, time = ""] = entry.at.split("T");
    const kind = entry.kind === "event" ? "event" : "manual";
    return {
      id: entry.id,
      memberId: member.id,
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
  const named = charge.venueName?.trim() || (charge.venueId ? venueById(charge.venueId).name : "");
  const action = charge.kind === "manual" ? t("player.manual") : charge.kind === "payment" ? t("player.deposit") : t("player.source.system");
  return { type, place: named || "—", action };
}

"use client";

import { ContentImage } from "@/app/components/content-image";
import { AdminDialog } from "@/app/components/admin-dialog";
import { chargesForMember, formatJersey, venueById, type Member, type PlayerCharge, type Subteam } from "@/app/lib/demo-data";
import type { EhlPlayerProfile } from "@/app/lib/ehl-player";
import { useFormatMoney } from "@/app/components/currency-provider";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { useTeamCatalog } from "@/app/lib/team-catalog";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function eventTitleKey(titleId: string): MessageKey {
  return `event.${titleId}` as MessageKey;
}

function roleKey(role: Member["role"]): MessageKey {
  return `role.${role}` as MessageKey;
}

export function PlayerProfile({ member, subteams, finance = true }: { member: Member; subteams?: Subteam[]; finance?: boolean }) {
  const { t } = useLanguage();
  const { subteamById } = useTeamCatalog();
  const ids = member.subteamIds?.length ? member.subteamIds : member.subteamId ? [member.subteamId] : [];
  const groups = ids.map((id) => subteams?.find((item) => item.id === id) ?? subteamById(id)).filter((item): item is Subteam => Boolean(item));
  const jersey = formatJersey(member.number);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
        <div className="flex items-start gap-4">
          {member.photoUrl ? (
            <ContentImage src={member.photoUrl} className="h-16 w-16 shrink-0 rounded-lg bg-ice object-contain object-center" />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-navy text-xl font-semibold text-white">{initials(member.name)}</span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>
            <p className="truncate text-sm leading-5 text-muted">{member.email}</p>
            {member.phone ? <p className="truncate text-sm leading-5 text-muted">{member.phone}</p> : null}
            <p className="mt-2 inline-flex rounded-full bg-ice px-2.5 py-0.5 text-xs font-medium text-muted">
              {t(roleKey(member.role))}
            </p>
          </div>
        </div>
        {jersey || groups.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {jersey ? (
              <div className="rounded-xl bg-ice px-4 py-3">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("player.number")}</p>
                <p className="mt-1 text-lg font-semibold text-train tabular-nums">{jersey}</p>
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

      {member.ehl ? <PlayerEhl profile={member.ehl} /> : null}

      {finance ? (
        <section className="rounded-2xl bg-paper ring-1 ring-line">
          <h2 className="px-4 pt-4 text-lg font-semibold sm:px-5">{t("player.log")}</h2>
          <PlayerBalanceLog member={member} />
        </section>
      ) : null}
    </div>
  );
}

export function PlayerBalanceDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <AdminDialog open title={t("player.log")} onClose={onClose} wide closeButton>
      <PlayerBalanceLog member={member} />
    </AdminDialog>
  );
}

export function PlayerBalanceLog({ member }: { member: Member }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const usingLedger = member.ledger != null;
  const charges = usingLedger ? ledgerCharges(member) : member.feeExempt ? [] : chargesForMember(member.id);
  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
  if (charges.length === 0) {
    return <p className="px-4 py-8 text-sm text-muted sm:px-5">{t(usingLedger ? "player.ledger.empty" : "player.empty")}</p>;
  }
  return (
    <>
      <ul className="mt-3 divide-y divide-line md:hidden">
        {charges.map((charge) => (
          <ChargeRow key={charge.id} charge={charge} />
        ))}
        <TotalRow total={total} />
      </ul>
      <div className="mt-2 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <th className="px-5 py-3 font-medium">{t("player.date")}</th>
              <th className="px-5 py-3 font-medium">{t("player.event")}</th>
              <th className="px-5 py-3 text-right font-medium">{t("player.payment")}</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((charge) => (
              <ChargeTableRow key={charge.id} charge={charge} />
            ))}
            <tr className="border-t border-line">
              <td className="px-5 py-3 font-semibold" colSpan={2}>
                {t("player.total")}
              </td>
              <td className={`px-5 py-3 text-right font-semibold tabular-nums ${total < 0 ? "text-game" : "text-ink"}`}>{formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
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

function ChargeRow({ charge }: { charge: PlayerCharge }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const { formatDate, formatTime } = useDisplayFormat();
  const details = chargeDetails(charge, t);
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium tabular-nums">{formatDate(charge.date)}</p>
        <p className="text-xs text-muted tabular-nums">{formatTime(charge.time)}</p>
        <p className="mt-2 font-medium">{details.title}</p>
        {details.meta ? <p className="text-sm text-muted">{details.meta}</p> : null}
      </div>
      <p className={`shrink-0 font-medium tabular-nums ${charge.amount < 0 ? "text-game" : "text-ink"}`}>
        {formatMoney(charge.amount)}
      </p>
    </li>
  );
}

function ChargeTableRow({ charge }: { charge: PlayerCharge }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  const { formatDate, formatTime } = useDisplayFormat();
  const details = chargeDetails(charge, t);
  return (
    <tr className="border-b border-line">
      <td className="px-5 py-3 align-top">
        <span className="block tabular-nums">{formatDate(charge.date)}</span>
        <span className="block text-xs text-muted tabular-nums">{formatTime(charge.time)}</span>
      </td>
      <td className="px-5 py-3 align-top">
        <span className="block font-medium">{details.title}</span>
        {details.meta ? <span className="block text-sm text-muted">{details.meta}</span> : null}
      </td>
      <td className={`px-5 py-3 text-right align-top font-medium tabular-nums ${charge.amount < 0 ? "text-game" : "text-ink"}`}>
        {formatMoney(charge.amount)}
      </td>
    </tr>
  );
}

function TotalRow({ total }: { total: number }) {
  const { t } = useLanguage();
  const formatMoney = useFormatMoney();
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="font-semibold">{t("player.total")}</span>
      <span className={`font-semibold tabular-nums ${total < 0 ? "text-game" : "text-ink"}`}>{formatMoney(total)}</span>
    </li>
  );
}

function ledgerCharges(member: Member): PlayerCharge[] {
  return (member.ledger ?? []).map((entry) => {
    const [date, time = ""] = entry.at.split("T");
    return { id: entry.id, memberId: member.id, date, time: time.slice(0, 5), amount: entry.amount, kind: "manual" };
  });
}

function chargeDetails(
  charge: PlayerCharge,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): { title: string; meta: string | null } {
  if (charge.kind === "manual") return { title: t("player.manual"), meta: null };
  if (charge.kind === "payment" || !charge.type || !charge.titleId || !charge.venueId) {
    return { title: t("player.deposit"), meta: null };
  }
  const venue = venueById(charge.venueId);
  const typeLabel = t(charge.type === "game" ? "legend.game" : "legend.training");
  return {
    title: t(eventTitleKey(charge.titleId)),
    meta: t("player.eventMeta", { type: typeLabel, place: venue.area }),
  };
}

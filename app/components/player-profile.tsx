"use client";

import { chargesForMember, venueById, type Member, type PlayerCharge } from "@/app/lib/demo-data";
import { formatDisplayDate, formatMoney } from "@/app/lib/format";
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

export function PlayerProfile({ member }: { member: Member }) {
  const { t } = useLanguage();
  const { subteamById } = useTeamCatalog();
  const charges = chargesForMember(member.id);
  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const subteam = subteamById(member.subteamId);
  const number = String(member.number).padStart(2, "0");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-navy text-xl font-semibold text-white">
            {initials(member.name)}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>
            <p className="mt-1 truncate text-sm text-muted">{member.email}</p>
            <p className="text-sm text-muted">{member.phone}</p>
            <p className="mt-2 inline-flex rounded-full bg-ice px-2.5 py-0.5 text-xs font-medium text-muted">
              {t(roleKey(member.role))}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-ice px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("player.number")}</p>
            <p className="mt-1 text-lg font-semibold text-train tabular-nums">#{number}</p>
          </div>
          <div className="rounded-xl bg-ice px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("player.subteams")}</p>
            {subteam ? (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium">
                <span className="h-4 w-4 rounded-md" style={{ background: subteam.color }} title={subteam.name} />
                {subteam.name}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-paper ring-1 ring-line">
        <h2 className="px-4 pt-4 text-lg font-semibold sm:px-5">{t("player.log")}</h2>
        {charges.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted sm:px-5">{t("player.empty")}</p>
        ) : (
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
                    <td className={`px-5 py-3 text-right font-semibold tabular-nums ${total < 0 ? "text-game" : "text-ink"}`}>
                      {formatMoney(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ChargeRow({ charge }: { charge: PlayerCharge }) {
  const { t } = useLanguage();
  const details = chargeDetails(charge, t);
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium tabular-nums">{formatDisplayDate(charge.date)}</p>
        <p className="text-xs text-muted tabular-nums">{charge.time}</p>
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
  const details = chargeDetails(charge, t);
  return (
    <tr className="border-b border-line">
      <td className="px-5 py-3 align-top">
        <span className="block tabular-nums">{formatDisplayDate(charge.date)}</span>
        <span className="block text-xs text-muted tabular-nums">{charge.time}</span>
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
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="font-semibold">{t("player.total")}</span>
      <span className={`font-semibold tabular-nums ${total < 0 ? "text-game" : "text-ink"}`}>{formatMoney(total)}</span>
    </li>
  );
}

function chargeDetails(
  charge: PlayerCharge,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): { title: string; meta: string | null } {
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

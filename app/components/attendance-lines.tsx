"use client";

import type { AttendanceStats } from "@/app/lib/attendance-stats";
import { useLanguage } from "@/app/lib/language";

function percent(going: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((going / total) * 100);
}

function Line({ label, going, total, strong }: { label: string; going: number; total: number; strong?: boolean }) {
  const rate = percent(going, total);
  return (
    <span className={`block whitespace-nowrap tabular-nums ${strong ? "font-medium" : ""}`}>
      <span className="text-muted">{label}</span> {going}/{total}
      {rate != null ? <span className="text-muted"> ({rate}%)</span> : null}
    </span>
  );
}

export function AttendanceLines({ stats }: { stats: AttendanceStats }) {
  const { t } = useLanguage();
  const going = stats.gamesGoing + stats.trainingsGoing;
  const total = stats.gamesTotal + stats.trainingsTotal;
  return (
    <span className="block text-xs leading-5">
      <Line label={t("roster.attendance.games")} going={stats.gamesGoing} total={stats.gamesTotal} />
      <Line label={t("roster.attendance.trainings")} going={stats.trainingsGoing} total={stats.trainingsTotal} />
      <Line label={t("roster.attendance.total")} going={going} total={total} strong />
    </span>
  );
}

export function AttendanceMark() {
  return (
    <sup className="ml-0.5 text-[10px] leading-none font-semibold tracking-normal normal-case" aria-hidden="true">
      *
    </sup>
  );
}

export function AttendanceLegend({ always = false }: { always?: boolean }) {
  const { t } = useLanguage();
  return (
    <p id="attendance-legend" className={`${always ? "" : "hidden min-[768px]:block "}border-t border-line px-4 py-2.5 text-xs leading-5 text-muted`}>
      <span className="mr-1.5 font-semibold text-ink" aria-hidden="true">*</span>
      {t("roster.attendance.legend")}
    </p>
  );
}

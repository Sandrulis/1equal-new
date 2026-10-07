"use client";

import { useEffect, useState } from "react";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { loadUmamiReport, type UmamiMetric, type UmamiRange, type UmamiReport } from "@/app/lib/integrations/umami-report";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";

const RANGES: UmamiRange[] = ["24h", "7d", "30d", "90d"];

export function AdminUmamiPage() {
  const { t, formatLang } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [range, setRange] = useState<UmamiRange>("7d");
  const [report, setReport] = useState<UmamiReport | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let live = true;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Riga";
    void loadUmamiReport(range, timezone).then((result) => {
      if (!live) return;
      setPending(false);
      if (!result.ok) {
        setReport(null);
        if (result.error !== "umami.unavailable") showFeedback({ message: t(result.error), variant: "error" });
        return;
      }
      setReport(result.report);
    });
    return () => {
      live = false;
    };
  }, [range, showFeedback, t]);

  function pickRange(next: UmamiRange) {
    if (next === range || pending) return;
    setPending(true);
    setRange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-muted">{report && (report.name || report.domain) ? t("umami.lead", { name: report.name || report.domain }) : t("umami.lead.empty")}</p>
        <div className="flex rounded-lg bg-ice p-1">
          {RANGES.map((item) => (
            <button key={item} type="button" disabled={pending} onClick={() => pickRange(item)} className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed ${item === range ? "bg-paper text-ink shadow-sm" : "text-muted"}`}>
              {t(`umami.range.${item}` as MessageKey)}
            </button>
          ))}
        </div>
      </div>
      {pending && !report ? <p className="text-sm text-muted">{t("admin.loading")}</p> : null}
      {!pending && !report ? <p className="text-sm text-muted">{t("umami.unavailable")}</p> : null}
      {report ? (
        <div className={pending ? "opacity-60" : ""}>
          <div className="grid gap-3 min-[600px]:grid-cols-3 xl:grid-cols-6">
            <Stat label={t("umami.active")} value={formatCount(report.active, formatLang)} />
            <Stat label={t("umami.visitors")} value={formatCount(report.visitors, formatLang)} change={changePercent(report.visitors, report.previous.visitors)} />
            <Stat label={t("umami.visits")} value={formatCount(report.visits, formatLang)} change={changePercent(report.visits, report.previous.visits)} />
            <Stat label={t("umami.pageviews")} value={formatCount(report.pageviews, formatLang)} change={changePercent(report.pageviews, report.previous.pageviews)} />
            <Stat label={t("umami.bounce")} value={formatPercent(rate(report.bounces, report.visits))} change={changePercent(rate(report.bounces, report.visits), rate(report.previous.bounces, report.previous.visits))} />
            <Stat label={t("umami.duration")} value={formatVisit(report.totalTime, report.visits)} change={changePercent(average(report.totalTime, report.visits), average(report.previous.totalTime, report.previous.visits))} />
          </div>
          <section className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-line">
            <h2 className="text-sm font-semibold">{t("umami.chart")}</h2>
            <Chart series={report.series} hour={range === "24h"} lang={formatLang} pageviewsLabel={t("umami.pageviews")} visitsLabel={t("umami.visits")} />
          </section>
          <div className="mt-4 grid gap-4 min-[600px]:grid-cols-2">
            <MetricCard title={t("umami.pages")} rows={report.pages} lang={formatLang} empty={t("umami.empty")} />
            <MetricCard title={t("umami.referrers")} rows={report.referrers} lang={formatLang} empty={t("umami.empty")} />
            <MetricCard title={t("umami.browsers")} rows={labelRows(report.browsers, (label) => titleCase(label))} lang={formatLang} empty={t("umami.empty")} />
            <MetricCard title={t("umami.os")} rows={report.systems} lang={formatLang} empty={t("umami.empty")} />
            <MetricCard title={t("umami.devices")} rows={labelRows(report.devices, (label) => deviceLabel(label, t))} lang={formatLang} empty={t("umami.empty")} />
            <MetricCard title={t("umami.countries")} rows={labelRows(report.countries, (label) => countryName(label, formatLang))} lang={formatLang} empty={t("umami.empty")} />
          </div>
          <p className="mt-4 text-sm">
            <a href={report.shareUrl} target="_blank" rel="noreferrer" className="font-medium text-navy underline-offset-2 hover:underline">
              {t("umami.open")}
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, change }: { label: string; value: string; change?: number | null }) {
  const shown = change === undefined || change === null ? null : `${change > 0 ? "+" : ""}${change}%`;
  return (
    <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {shown ? <p className="mt-1 text-xs text-muted">{shown}</p> : null}
    </div>
  );
}

function Chart({
  series,
  hour,
  lang,
  pageviewsLabel,
  visitsLabel,
}: {
  series: UmamiReport["series"];
  hour: boolean;
  lang: string;
  pageviewsLabel: string;
  visitsLabel: string;
}) {
  const peak = Math.max(1, ...series.map((point) => point.pageviews));
  if (!series.length) return null;
  return (
    <div className="mt-4 flex h-36 items-end gap-1">
      {series.map((point) => (
        <div key={point.at} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
          <div className="rounded-sm bg-navy/80" style={{ height: `${Math.max(4, Math.round((point.pageviews / peak) * 100))}%` }} />
          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
            {formatBucket(point.at, hour, lang)} · {pageviewsLabel} {point.pageviews} · {visitsLabel} {point.sessions}
          </span>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ title, rows, lang, empty }: { title: string; rows: UmamiMetric[]; lang: string; empty: string }) {
  const peak = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="rounded-2xl bg-paper p-4 ring-1 ring-line">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length ? (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{row.label}</span>
                <span className="mt-1 block h-1.5 rounded-full bg-ice">
                  <span className="block h-1.5 rounded-full bg-navy/70" style={{ width: `${Math.max(6, Math.round((row.value / peak) * 100))}%` }} />
                </span>
              </span>
              <span className="tabular-nums text-muted">{formatCount(row.value, lang)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}

function formatCount(value: number, lang: string): string {
  return new Intl.NumberFormat(lang).format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatVisit(totalSeconds: number, visits: number): string {
  const seconds = Math.round(average(totalSeconds, visits));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function average(total: number, count: number): number {
  if (count <= 0) return 0;
  return total / count;
}

function rate(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function changePercent(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatBucket(value: string, hour: boolean, lang: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (hour) return new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(date);
  return new Intl.DateTimeFormat(lang, { day: "2-digit", month: "2-digit" }).format(date);
}

function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function deviceLabel(value: string, t: (key: MessageKey) => string): string {
  if (value === "mobile") return t("umami.device.mobile");
  if (value === "laptop") return t("umami.device.laptop");
  if (value === "desktop") return t("umami.device.desktop");
  if (value === "tablet") return t("umami.device.tablet");
  return titleCase(value);
}

function countryName(code: string, lang: string): string {
  try {
    return new Intl.DisplayNames(lang, { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function labelRows(rows: UmamiMetric[], label: (value: string) => string): UmamiMetric[] {
  return rows.map((row) => ({ ...row, label: label(row.label) }));
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { formatMoney } from "@/app/lib/format";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import { Old2NewPreview } from "@/app/components/old-2-new-preview";
import { STEP_IDS, type ProgressEvent, type ScanReport, type StepId, type StepState } from "@/app/lib/old-2-new/types";

const STEP_KEY: Record<StepId, MessageKey> = {
  read: "old2new.step.read",
  users: "old2new.step.users",
  team: "old2new.step.team",
  members: "old2new.step.members",
  events: "old2new.step.events",
  rsvp: "old2new.step.rsvp",
  balances: "old2new.step.balances",
};

const RULES: MessageKey[] = [
  "old2new.rule.team",
  "old2new.rule.login",
  "old2new.rule.photos",
  "old2new.rule.people",
  "old2new.rule.events",
  "old2new.rule.money",
];

type StepRow = { id: StepId; done: number; total: number; state: StepState };

function emptySteps(): StepRow[] {
  return STEP_IDS.map((id) => ({ id, done: 0, total: 0, state: "wait" }));
}

function percent(step: StepRow): number {
  if (step.state === "ok") return 100;
  if (step.total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((step.done / step.total) * 100)));
}

export function Old2NewScreen({ allowed }: { allowed: boolean }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [steps, setSteps] = useState<StepRow[]>(emptySteps);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [busy, setBusy] = useState<"scan" | "import" | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [problem, setProblem] = useState("");

  if (!allowed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
        <p className="text-sm text-zinc-600">{t("old2new.forbidden")}</p>
      </main>
    );
  }

  async function run(phase: "scan" | "import") {
    setBusy(phase);
    setProblem("");
    if (phase === "import") setSteps(emptySteps());
    try {
      const response = await fetch("/api/old-2-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, confirm: phase === "import" ? confirm : false }),
      });
      if (response.status === 401 || response.status === 403) {
        const message = t("old2new.forbidden");
        setProblem(message);
        showFeedback({ message, variant: "error" });
        return;
      }
      if (!response.ok || !response.body) {
        const message = t("old2new.error.failed");
        setProblem(message);
        showFeedback({ message, variant: "error" });
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { type?: string; report?: ScanReport; message?: string; step?: StepId; done?: number; total?: number; state?: StepState };
          if (event.type === "report" && event.report) setReport(event.report);
          if (event.type === "progress" && event.step && event.state) {
            const next: ProgressEvent = { step: event.step, done: event.done ?? 0, total: event.total ?? 0, state: event.state };
            setSteps((current) => current.map((step) => (step.id === next.step ? { id: next.step, done: next.done, total: next.total, state: next.state } : step)));
          }
          if (event.type === "error") {
            const message = event.message?.startsWith("old2new.") ? t(event.message as MessageKey) : (event.message || t("old2new.error.failed"));
            setProblem(message);
            setSteps((current) => current.map((step) => (step.state === "run" ? { ...step, state: "err" } : step)));
            showFeedback({ message, variant: "error" });
          }
          if (event.type === "done") showFeedback({ message: t("old2new.done"), variant: "success" });
        }
      }
    } catch {
      const message = t("old2new.error.failed");
      setProblem(message);
      showFeedback({ message, variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  const canImport = Boolean(report && report.canWrite && !report.alreadyInNewDb && confirm && busy === null);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-navy">{t("old2new.back")}</Link>
      <h1 className="mt-3 text-2xl font-semibold text-navy">{t("old2new.title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("old2new.lead")}</p>
      <ul className="mt-6 space-y-2 text-sm text-zinc-700">
        {RULES.map((key) => (
          <li key={key} className="rounded-lg bg-zinc-50 px-3 py-2">{t(key)}</li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" disabled={busy !== null} onClick={() => void run("scan")} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
          {busy === "scan" ? t("old2new.scanning") : t("old2new.scan")}
        </button>
        <button type="button" disabled={!canImport} onClick={() => void run("import")} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50">
          {busy === "import" ? t("old2new.importing") : t("old2new.import")}
        </button>
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
        <input type="checkbox" className="mt-1" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
        <span>{t("old2new.confirm")}</span>
      </label>
      <p className="mt-2 text-sm text-zinc-500">{t("old2new.scan_hint")}</p>

      {report ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-navy">
            {t("old2new.summary", { name: report.teamName, code: report.inviteCode, balance: formatMoney(report.balance) })}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Count label={t("old2new.count.users")} value={report.counts.users} />
            <Count label={t("old2new.count.members")} value={report.counts.members} />
            <Count label={t("old2new.count.subteams")} value={report.counts.subteams} />
            <Count label={t("old2new.count.venues")} value={report.counts.venues} />
            <Count label={t("old2new.count.events")} value={report.counts.events} />
            <Count label={t("old2new.count.rsvp")} value={report.counts.rsvp} />
            <Count label={t("old2new.count.invoices")} value={report.counts.invoices} />
            <Count label={t("old2new.count.other")} value={report.counts.otherTeams} />
          </dl>
          <ul className="mt-4 space-y-1 text-sm text-zinc-700">
            {warnings(report).map((item) => (
              <li key={item.key}>{t(item.key, item.params)}</li>
            ))}
          </ul>
          {report.preview ? <Old2NewPreview preview={report.preview} /> : null}
        </section>
      ) : null}

      <ol className="mt-8 space-y-4">
        {steps.map((step) => (
          <li key={step.id}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-navy">{t(STEP_KEY[step.id])}</span>
              <span className="text-zinc-500">{step.state === "wait" ? t("old2new.wait") : `${step.done} / ${step.total}`}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200">
              <div className={`h-full ${step.state === "err" ? "bg-red-600" : "bg-navy"}`} style={{ width: `${percent(step)}%` }} />
            </div>
          </li>
        ))}
      </ol>
      {problem ? <p className="mt-4 text-sm text-red-700">{problem}</p> : null}
      {problem && steps.some((step) => step.state === "ok" && step.id !== "read") ? <p className="mt-1 text-sm text-zinc-600">{t("old2new.error.partial")}</p> : null}
    </main>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-lg font-semibold text-navy">{value}</dd>
    </div>
  );
}

function warnings(report: ScanReport): { key: MessageKey; params?: Record<string, number> }[] {
  const counts = report.counts;
  const items: { key: MessageKey; params?: Record<string, number> }[] = [{ key: "old2new.warn.photos" }];
  if (report.alreadyInNewDb) items.push({ key: "old2new.warn.already" });
  if (!report.canWrite) items.push({ key: "old2new.warn.service" });
  const withCount: [number, MessageKey][] = [
    [counts.otherTeams, "old2new.warn.others"],
    [counts.existingUsers, "old2new.warn.existing"],
    [counts.noPassword, "old2new.warn.no_password"],
    [counts.hiddenMembers, "old2new.warn.hidden_members"],
    [counts.kids, "old2new.warn.kids"],
    [counts.parents, "old2new.warn.parents"],
    [counts.addresses, "old2new.warn.addresses"],
    [counts.jerseyCleared, "old2new.warn.jersey"],
    [counts.defenseFolded, "old2new.warn.defense"],
    [counts.hiddenEvents, "old2new.warn.hidden_events"],
    [counts.meetings, "old2new.warn.meetings"],
    [counts.waitingRsvp, "old2new.warn.waiting"],
    [counts.gamesWithoutExpense, "old2new.warn.game_expense"],
    [counts.missingVenue, "old2new.warn.no_venue"],
    [counts.guestUsers, "old2new.warn.guests"],
    [counts.balanceAdjustments, "old2new.warn.adjust"],
    [counts.invoices, "old2new.warn.invoices"],
    [counts.brokenLineups, "old2new.warn.lineup"],
  ];
  for (const [count, key] of withCount) {
    if (count > 0) items.push({ key, params: { n: count } });
  }
  return items;
}

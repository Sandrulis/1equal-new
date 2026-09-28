"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { IconTipButton } from "@/app/components/icon-tip-button";
import { loadFinanceCron, saveFinanceCron } from "@/app/lib/site-admin/actions";
import { useLanguage } from "@/app/lib/language";

export function AdminCronPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let live = true;
    void loadFinanceCron().then((result) => {
      if (!live) return;
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        setReady(true);
        return;
      }
      setEnabled(result.enabled);
      setUrl(result.url);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [showFeedback, t]);

  async function toggle() {
    if (pending || !ready) return;
    const next = !enabled;
    setPending(true);
    const result = await saveFinanceCron(next);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setEnabled(next);
    showFeedback({ message: t("user.settings.saved"), variant: "success" });
    router.refresh();
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showFeedback({ message: t("calendar.export.copied"), variant: "success" });
    } catch {
      showFeedback({ message: t("auth.error.generic"), variant: "error" });
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted">{t("admin.cron.lead")}</p>
      <div className="mt-4 rounded-xl bg-paper p-4 ring-1 ring-line">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("admin.cron.url")}</p>
            <p className="mt-1 text-xs text-muted">{t("admin.cron.schedule")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={t("admin.cron.switch")}
            disabled={pending || !ready}
            onClick={() => void toggle()}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? "bg-train" : "bg-line"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper ${enabled ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-1 rounded-lg bg-ice py-1 pr-1 pl-3">
          <p className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{url || "..."}</p>
          <IconTipButton label={t("admin.cron.copy")} tone="muted" disabled={!url} onClick={() => void copy()}>
            <IconCopy />
          </IconTipButton>
        </div>
        <a href="https://console.cron-job.org/jobs" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-train hover:underline">
          {t("admin.cron.open")}
        </a>
      </div>
    </div>
  );
}

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

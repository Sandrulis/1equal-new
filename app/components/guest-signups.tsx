"use client";

import { useState } from "react";
import { useDisplayFormat } from "@/app/components/display-preferences";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useLanguage } from "@/app/lib/language";
import type { GuestSignup } from "@/app/lib/training-guests";
import { leaveTrainingAsGuest } from "@/app/lib/training-guests";

export function GuestSignups({
  visits,
  tone,
  onLeft,
}: {
  visits: GuestSignup[];
  tone: "navy" | "paper";
  onLeft: (eventId: string) => void;
}) {
  const { t } = useLanguage();
  const { formatDate, formatTime } = useDisplayFormat();
  const { showFeedback } = useFeedbackToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const navy = tone === "navy";

  async function leave(eventId: string) {
    if (pendingId) return;
    setPendingId(eventId);
    const result = await leaveTrainingAsGuest(eventId);
    setPendingId(null);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    onLeft(eventId);
    showFeedback({ message: t("pond.left"), variant: "success" });
  }

  return (
    <section aria-label={t("pond.mine")}>
      <h2 className={`text-xs font-semibold tracking-wide uppercase ${navy ? "px-2 text-white/60" : "text-muted"}`}>{t("pond.mine")}</h2>
      <ul className="mt-2 space-y-2">
        {visits.map((visit) => (
          <li key={visit.eventId} className={navy ? "rounded-xl bg-white/10 p-2.5 text-sm text-white" : "rounded-2xl bg-paper p-4 text-sm ring-1 ring-line"}>
            <p className="font-medium">{visit.teamName}</p>
            <p className={navy ? "mt-0.5 text-xs text-white/70" : "mt-0.5 text-xs text-muted"}>
              {formatDate(visit.date)} {formatTime(visit.start)}
              {visit.venue ? ` ${visit.venue}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`/training/${visit.eventId}`} className={navy ? "cursor-pointer rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-navy" : "cursor-pointer rounded-lg bg-navy px-2.5 py-1 text-xs font-medium text-white"}>
                {t("pond.open")}
              </a>
              <button
                type="button"
                disabled={pendingId !== null}
                onClick={() => void leave(visit.eventId)}
                className={navy ? "rounded-lg px-2.5 py-1 text-xs font-medium text-white/80 ring-1 ring-white/30 disabled:cursor-not-allowed disabled:opacity-40" : "rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed disabled:opacity-40"}
              >
                {t("pond.cancel")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

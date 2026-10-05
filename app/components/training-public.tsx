"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/app/components/site-header";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { useLanguage } from "@/app/lib/language";
import type { PublicTraining } from "@/app/lib/training-guests";
import { joinTrainingAsGuest, leaveTrainingAsGuest } from "@/app/lib/training-guests";

export function TrainingPublic({ training }: { training: PublicTraining }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [pending, setPending] = useState(false);
  const loginHref = `/login?next=/training/${training.id}`;

  async function join() {
    if (pending) return;
    setPending(true);
    const result = await joinTrainingAsGuest(training.id);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t("pond.joined"), variant: "success" });
    router.refresh();
  }

  async function leave() {
    if (pending) return;
    setPending(true);
    const result = await leaveTrainingAsGuest(training.id);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t("pond.left"), variant: "success" });
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-ice">
      <SiteHeader account={training.account} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <article className="rounded-2xl bg-paper p-6 ring-1 ring-line">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted">{training.teamName}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("legend.training")}</h1>
            </div>
            {training.playerPrice ? (
              <div className="shrink-0 text-right">
                <p className="text-sm text-muted">{t("event.price")}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{training.playerPrice}</p>
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex items-start justify-between gap-4 text-sm">
            <div className="min-w-0">
              <p className="text-muted">{t("event.date")}</p>
              <p className="font-medium">{training.date} {training.time}</p>
            </div>
            {training.venue ? (
              <div className="shrink-0 text-right">
                <p className="text-muted">{t("event.venue")}</p>
                <p className="font-medium">{training.venue}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            {training.ended ? <p className="text-sm text-muted">{t("pond.ended")}</p> : null}
            {!training.ended && training.viewer === "out" ? (
              <a href={loginHref} className="inline-flex cursor-pointer rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90">
                {t("pond.login")}
              </a>
            ) : null}
            {!training.ended && training.viewer === "member" ? <p className="text-sm text-muted">{t("pond.member")}</p> : null}
            {!training.ended && training.viewer === "guest" ? (
              <button type="button" disabled={pending} onClick={() => void join()} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                {t("pond.signup")}
              </button>
            ) : null}
            {!training.ended && training.viewer === "signed" ? (
              <button type="button" disabled={pending} onClick={() => void leave()} className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed disabled:opacity-40">
                {t("pond.cancel")}
              </button>
            ) : null}
          </div>

          <h2 className="mt-8 text-sm font-semibold">{t("pond.going")}</h2>
          {training.going.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("pond.empty")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {training.going.map((person) => (
                <li key={person.userId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-medium">{person.name || t("pond.guest")}</span>
                  {person.guest ? <span className="text-xs text-muted">{t("pond.guest")}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </main>
    </div>
  );
}

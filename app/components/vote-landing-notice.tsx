"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconCheck, IconX } from "@/app/components/icon-tip-button";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";

type VoteState = "going" | "absent" | "closed" | "invalid" | "error";

type VotePayload = {
  state: VoteState;
  summary: string;
  current: "going" | "absent" | "pending" | null;
  dashboardUrl: string;
};

const TITLE: Record<VoteState, MessageKey> = {
  going: "email.vote.thanks",
  absent: "email.vote.thanks",
  closed: "email.vote.closed",
  invalid: "email.vote.invalid",
  error: "email.vote.error",
};

export function VoteLandingNotice({
  token,
  choice,
  children,
}: {
  token: string;
  choice: "going" | "absent" | "";
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const [payload, setPayload] = useState<VotePayload | null>(choice ? null : { state: "invalid", summary: "", current: null, dashboardUrl: "/dashboard" });
  const [closeAt, setCloseAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!token || !choice) return;
    const ac = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/email-vote", {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify({ token, choice }),
          signal: ac.signal,
        });
        const data = (await response.json()) as VotePayload;
        if (ac.signal.aborted) return;
        setPayload(data);
        if (data.state === "going" || data.state === "absent") {
          const stamp = Date.now();
          setNow(stamp);
          setCloseAt(stamp + 3000);
        }
      } catch (error) {
        if (ac.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        setPayload({ state: "error", summary: "", current: null, dashboardUrl: "/dashboard" });
      }
    })();
    return () => {
      ac.abort();
    };
  }, [choice, token]);

  useEffect(() => {
    if (!closeAt) return;
    const timer = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= closeAt) {
        window.clearInterval(timer);
        window.close();
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [closeAt]);

  const state = payload?.state ?? "going";
  const saved = state === "going" || state === "absent";
  const secondsLeft = closeAt ? Math.max(0, Math.ceil((closeAt - now) / 1000)) : 0;
  const title = t(TITLE[state]);
  const summary = payload?.summary ?? "";
  const current = payload?.current === "going" || payload?.current === "absent" ? payload.current : null;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <div className="pointer-events-none max-h-dvh overflow-hidden select-none" aria-hidden inert>
        {children}
      </div>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="vote-title">
        <div className="absolute inset-0 bg-ink/40 backdrop-blur-md" />
        <div className="relative w-full max-w-lg rounded-2xl bg-paper p-6 ring-1 ring-line">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className={`grid h-11 w-11 place-items-center rounded-full [&_svg]:h-5 [&_svg]:w-5 ${saved ? "bg-train-soft text-train" : "bg-game-soft text-game"}`}>
              {saved ? <IconCheck /> : <IconX />}
            </div>
            {saved && closeAt ? <p className="pt-2 text-sm tabular-nums text-muted">{t("email.vote.tab_closes", { seconds: secondsLeft })}</p> : null}
          </div>
          <h1 id="vote-title" className="text-lg font-semibold tracking-tight">
            {title}
          </h1>
          {summary ? <p className="mt-2 text-sm leading-6 text-muted">{summary}</p> : null}
          {state === "closed" && current ? <p className="mt-3 text-sm leading-6 text-muted">{t("email.vote.closed_current", { choice: t(current === "going" ? "email.vote.going" : "email.vote.absent") })}</p> : null}
          {saved ? null : (
            <p className="mt-4">
              <a href={payload?.dashboardUrl || "/dashboard"} className="text-sm font-semibold text-navy">
                {t("email.vote.open")}
              </a>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

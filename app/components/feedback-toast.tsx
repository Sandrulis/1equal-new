"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/app/lib/language";

export type FeedbackVariant = "success" | "error" | "info";

type Feedback = {
  message: string;
  variant: FeedbackVariant;
};

type FeedbackContextValue = {
  showFeedback: (feedback: Feedback) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const VARIANT_CLASS: Record<FeedbackVariant, string> = {
  success: "bg-[#e8f6ee] text-[#14643a] ring-[#b7e0c6]",
  error: "bg-game-soft text-game ring-[#f3c6c2]",
  info: "bg-[#e7f1fb] text-[#1a4f86] ring-[#c5daf3]",
};

export function FeedbackToastProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const showFeedback = useCallback((next: Feedback) => setFeedback(next), []);
  const value = useMemo(() => ({ showFeedback }), [showFeedback]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {feedback ? (
        <FeedbackToast
          key={`${feedback.variant}:${feedback.message}`}
          message={feedback.message}
          variant={feedback.variant}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedbackToast() {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error("useFeedbackToast must be used within FeedbackToastProvider");
  return value;
}

function FeedbackToast({
  message,
  variant,
  durationMs = 5000,
  onDismiss,
}: Feedback & { durationMs?: number; onDismiss: () => void }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const aboveAppNav = pathname.startsWith("/dashboard") || pathname.startsWith("/demo");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timeoutRef.current = setTimeout(onDismiss, durationMs);
  }, [clearTimer, durationMs, onDismiss]);

  useEffect(() => {
    if (!hoveredRef.current) startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => {
        hoveredRef.current = true;
        clearTimer();
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        startTimer();
      }}
      className={`pointer-events-auto fixed right-4 bottom-4 z-[80] w-[min(100%-2rem,22rem)] ${aboveAppNav ? "max-[599px]:bottom-24" : ""} ${VARIANT_CLASS[variant]} rounded-xl px-4 py-3 text-sm shadow-[0_16px_40px_rgba(16,36,51,0.16)] ring-1`}
    >
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 leading-6">{message}</p>
        <button type="button" aria-label={t("event.close")} onClick={onDismiss} className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-black/5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

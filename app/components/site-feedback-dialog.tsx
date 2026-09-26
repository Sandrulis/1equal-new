"use client";

import { useState, type FormEvent } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { sendUserFeedback, type FeedbackKind } from "@/app/lib/feedback/actions";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";

const COPY: Record<FeedbackKind, { title: MessageKey; lead: MessageKey; sent: MessageKey; titlePlaceholder?: MessageKey; bodyPlaceholder: MessageKey }> = {
  bug: {
    title: "nav.report_bug",
    lead: "feedback.bug.lead",
    sent: "feedback.bug.sent",
    titlePlaceholder: "feedback.bug.title_placeholder",
    bodyPlaceholder: "feedback.bug.body_placeholder",
  },
  suggestion: {
    title: "nav.suggestions",
    lead: "feedback.suggestions.lead",
    sent: "feedback.suggestions.sent",
    titlePlaceholder: "feedback.suggestions.title_placeholder",
    bodyPlaceholder: "feedback.suggestions.body_placeholder",
  },
  feedback: {
    title: "nav.feedback",
    lead: "feedback.general.lead",
    sent: "feedback.general.sent",
    bodyPlaceholder: "feedback.general.body_placeholder",
  },
};

export function SiteFeedbackDialog({ kind, onClose }: { kind: FeedbackKind | null; onClose: () => void }) {
  if (!kind) return null;
  const copy = COPY[kind];
  return <FeedbackForm key={kind} kind={kind} copy={copy} onClose={onClose} />;
}

function FeedbackForm({
  kind,
  copy,
  onClose,
}: {
  kind: FeedbackKind;
  copy: (typeof COPY)[FeedbackKind];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const result = await sendUserFeedback({ kind, title, body, rating: kind === "feedback" ? rating : undefined });
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t(copy.sent), variant: "success" });
    onClose();
  }

  return (
    <AdminDialog open title={t(copy.title)} lead={t(copy.lead)} onClose={onClose} closeButton>
      <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        {kind === "feedback" ? <StarRating value={rating} onChange={setRating} /> : null}
        {copy.titlePlaceholder ? (
          <label className="grid gap-1.5 text-sm font-medium">
            {t("feedback.field.title")}
            <input
              required
              value={title}
              maxLength={200}
              placeholder={t(copy.titlePlaceholder)}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-lg bg-paper px-3 text-sm font-normal ring-1 ring-line"
            />
          </label>
        ) : null}
        <label className="grid gap-1.5 text-sm font-medium">
          {t("feedback.field.body")}
          <textarea
            required
            value={body}
            rows={5}
            maxLength={4000}
            placeholder={t(copy.bodyPlaceholder)}
            onChange={(event) => setBody(event.target.value)}
            className="rounded-lg bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={pending} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
            {t("landing.contact.send")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const { t } = useLanguage();
  return (
    <div>
      <p id="feedback-rating" className="text-sm font-medium">
        {t("feedback.general.rating")}
      </p>
      <div role="radiogroup" aria-labelledby="feedback-rating" className="mt-1.5 flex gap-1">
        {([1, 2, 3, 4, 5] as const).map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={t("feedback.general.rating_star", { count: star })}
            onClick={() => onChange(star)}
            className={`grid h-9 w-9 place-items-center rounded-lg hover:bg-ice ${value >= star ? "text-amber-500" : "text-muted"}`}
          >
            <Star filled={value >= star} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3.2l2.4 5.6 6.1.6-4.6 4 1.4 6-5.3-3.2L6.7 19.4l1.4-6-4.6-4 6.1-.6L12 3.2z" />
    </svg>
  );
}

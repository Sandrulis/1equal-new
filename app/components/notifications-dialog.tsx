"use client";

import { useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { saveEventEmails } from "@/app/lib/auth/actions";
import { useLanguage } from "@/app/lib/language";

export function NotificationsDialog({
  enabled,
  onClose,
  onSaved,
}: {
  enabled: boolean;
  onClose: () => void;
  onSaved: (enabled: boolean) => void;
}) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [on, setOn] = useState(enabled);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !on;
    setPending(true);
    const result = await saveEventEmails(next);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setOn(next);
    onSaved(next);
    showFeedback({ message: t("user.settings.saved"), variant: "success" });
  }

  return (
    <AdminDialog open closeButton title={t("user.notices")} lead={t("user.notices.lead")} onClose={pending ? () => undefined : onClose}>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-ice px-3 py-2.5">
        <span>
          <span className="block text-sm font-medium">{t("user.notices.events")}</span>
          <span className="block text-xs text-muted">{t("user.notices.events_hint")}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t("user.notices.events")}
          disabled={pending}
          onClick={() => void toggle()}
          className={`relative h-6 w-11 shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${on ? "bg-train" : "bg-line"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper ${on ? "left-5" : "left-0.5"}`} />
        </button>
      </div>
    </AdminDialog>
  );
}

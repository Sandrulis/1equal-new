"use client";

import { useEffect, useRef, useState } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { ensureCalendarToken, regenerateCalendarToken } from "@/app/lib/calendar/actions";
import { useLanguage } from "@/app/lib/language";

export function CalendarExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [token, setToken] = useState("");
  const [stored, setStored] = useState(false);
  const [pending, setPending] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let active = true;
    void ensureCalendarToken().then((result) => {
      if (!active) return;
      setPending(false);
      if (!result.ok) {
        showFeedback({ message: t(result.error), variant: "error" });
        onCloseRef.current();
        return;
      }
      setToken(result.token);
      setStored(Boolean(result.stored));
    });
    return () => {
      active = false;
    };
  }, [showFeedback, t]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = token && origin ? `${origin}/cal/${token}` : "";
  const webcal = token && origin ? `webcal://${window.location.host}/cal/${token}` : "";

  async function renew() {
    setPending(true);
    const result = await regenerateCalendarToken();
    setPending(false);
    setRenewing(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setToken(result.token);
    setStored(false);
    showFeedback({ message: t("calendar.export.renewed"), variant: "success" });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showFeedback({ message: t("calendar.export.copied"), variant: "success" });
    } catch {
      showFeedback({ message: t("auth.error.generic"), variant: "error" });
    }
  }

  return (
    <AdminDialog open closeButton title={t("frontend_modules.calendar")} lead={t("calendar.export.lead")} onClose={onClose}>
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("calendar.export.ical")}</h3>
          <p className="text-sm text-muted">{t("calendar.export.ical_help")}</p>
          {link ? (
            <a href={`${link}?download=1`} download="calendar.ics" className="inline-flex cursor-pointer rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white">
              {t("calendar.export.ical")}
            </a>
          ) : null}
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("calendar.export.google")}</h3>
          <p className="text-sm text-muted">{t("calendar.export.google_help")}</p>
          <button
            type="button"
            disabled={!webcal || pending}
            onClick={() => window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`, "_blank", "noopener,noreferrer")}
            className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("calendar.export.open_google")}
          </button>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("calendar.export.url")}</h3>
          <p className="text-sm text-muted">{stored && !link ? t("calendar.export.stored") : t("calendar.export.url_help")}</p>
          <input readOnly value={link} spellCheck={false} className="w-full rounded-lg bg-ice px-3 py-2 font-mono text-xs text-ink ring-1 ring-line outline-none" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!link || pending} onClick={() => void copy()} className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              {t("calendar.export.copy")}
            </button>
            {renewing ? (
              <>
                <p className="w-full text-sm text-muted">{t("calendar.export.renew_lead")}</p>
                <button type="button" disabled={pending} onClick={() => setRenewing(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
                  {t("actions.cancel")}
                </button>
                <button type="button" disabled={pending} onClick={() => void renew()} className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                  {t("calendar.export.renew")}
                </button>
              </>
            ) : (
              <button type="button" disabled={(!token && !stored) || pending} onClick={() => setRenewing(true)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
                {t("calendar.export.renew")}
              </button>
            )}
          </div>
        </section>
      </div>
    </AdminDialog>
  );
}

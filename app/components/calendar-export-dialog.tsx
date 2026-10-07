"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faApple, faGoogle } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { ensureCalendarToken, regenerateCalendarToken } from "@/app/lib/calendar/actions";
import { useLanguage } from "@/app/lib/language";

type Provider = "apple" | "google";

function webcalFromHttps(httpsUrl: string): string {
  return httpsUrl.replace(/^https:/i, "webcal:").replace(/^http:/i, "webcal:");
}

function googleSubscribeUrl(httpsUrl: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}`;
}

export function CalendarExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [token, setToken] = useState("");
  const [stored, setStored] = useState(false);
  const [pending, setPending] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [provider, setProvider] = useState<Provider>("apple");
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
  const httpsUrl = token && origin ? `${origin}/cal/${token}` : "";
  const webcalUrl = httpsUrl ? webcalFromHttps(httpsUrl) : "";
  const activeUrl = provider === "apple" ? webcalUrl : httpsUrl;

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

  async function copy(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showFeedback({ message: t("calendar.export.copied"), variant: "success" });
    } catch {
      showFeedback({ message: t("auth.error.generic"), variant: "error" });
    }
  }

  return (
    <AdminDialog open closeButton wide title={t("frontend_modules.calendar")} lead={t("calendar.export.lead")} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="mb-2 px-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("calendar.export.choose")}</p>
          <div className="grid gap-2 min-[600px]:grid-cols-2">
            <ProviderCard
              selected={provider === "apple"}
              disabled={pending}
              icon={faApple}
              title={t("calendar.export.apple")}
              hint={t("calendar.export.apple_hint")}
              onSelect={() => setProvider("apple")}
            />
            <ProviderCard
              selected={provider === "google"}
              disabled={pending}
              icon={faGoogle}
              title={t("calendar.export.google")}
              hint={t("calendar.export.google_hint")}
              onSelect={() => setProvider("google")}
            />
          </div>
        </div>

        {activeUrl && provider === "apple" ? (
          <FeedBox
            label={t("calendar.export.apple_link")}
            value={webcalUrl}
            help={t("calendar.export.apple_help")}
            copyLabel={t("calendar.export.copy")}
            actionLabel={t("calendar.export.open_apple")}
            busy={pending}
            onCopy={() => void copy(webcalUrl)}
            onAction={() => {
              window.location.href = webcalUrl;
            }}
          />
        ) : null}

        {activeUrl && provider === "google" ? (
          <FeedBox
            label={t("calendar.export.google_link")}
            value={httpsUrl}
            help={t("calendar.export.google_help")}
            copyLabel={t("calendar.export.copy")}
            actionLabel={t("calendar.export.open_google")}
            busy={pending}
            onCopy={() => void copy(httpsUrl)}
            onAction={() => {
              window.open(googleSubscribeUrl(httpsUrl), "_blank", "noopener,noreferrer");
            }}
          />
        ) : null}

        {stored && !httpsUrl ? <p className="text-sm leading-6 text-muted">{t("calendar.export.stored")}</p> : null}
        {httpsUrl ? <p className="text-sm leading-6 text-muted">{t("calendar.export.copy_now")}</p> : null}

        {renewing ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <p className="mr-auto text-sm text-muted">{t("calendar.export.renew_lead")}</p>
            <button type="button" disabled={pending} onClick={() => setRenewing(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ice disabled:cursor-not-allowed">
              {t("actions.cancel")}
            </button>
            <button type="button" disabled={pending} onClick={() => void renew()} className="rounded-lg bg-game px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              {t("calendar.export.renew")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={(!token && !stored) || pending}
            onClick={() => setRenewing(true)}
            className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("calendar.export.renew")}
          </button>
        )}
      </div>
    </AdminDialog>
  );
}

function ProviderCard({
  selected,
  disabled,
  icon,
  title,
  hint,
  onSelect,
}: {
  selected: boolean;
  disabled: boolean;
  icon: IconDefinition;
  title: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-xl px-3.5 py-3 text-left ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "bg-ice ring-ink" : "bg-paper ring-line hover:bg-ice"}`}
    >
      <span className="flex items-center gap-2">
        <FontAwesomeIcon icon={icon} className="text-[14px]" />
        <span className="text-sm font-medium">{title}</span>
      </span>
      <span className="mt-1 block text-xs leading-snug text-muted">{hint}</span>
    </button>
  );
}

function FeedBox({
  label,
  value,
  help,
  copyLabel,
  actionLabel,
  busy,
  onCopy,
  onAction,
}: {
  label: string;
  value: string;
  help: string;
  copyLabel: string;
  actionLabel: string;
  busy: boolean;
  onCopy: () => void;
  onAction: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} spellCheck={false} className="min-h-9 min-w-0 flex-1 rounded-xl bg-ice px-3 font-mono text-xs text-ink ring-1 ring-line outline-none" />
        <button type="button" disabled={busy || !value} onClick={onCopy} className="shrink-0 rounded-xl bg-paper px-3 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed disabled:opacity-50">
          {copyLabel}
        </button>
      </div>
      <button type="button" disabled={busy || !value} onClick={onAction} className="inline-flex min-h-9 items-center rounded-xl bg-navy px-3.5 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50">
        {actionLabel}
      </button>
      <p className="text-xs leading-snug text-muted">{help}</p>
    </div>
  );
}

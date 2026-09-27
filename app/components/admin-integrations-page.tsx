"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { resetIntegration, saveIntegration, setIntegrationEnabled } from "@/app/lib/integrations/actions";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";
import type { IntegrationKey, IntegrationStatus } from "@/app/lib/site-admin/types";

type Draft = {
  clientId: string;
  secret: string;
  replyTo: string;
};

const fieldClass = "mt-1.5 w-full rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line outline-none focus:ring-navy disabled:cursor-not-allowed disabled:opacity-60";

export function AdminIntegrationsPage({
  integrations,
  googleRedirectUrl,
}: {
  integrations: IntegrationStatus[];
  googleRedirectUrl: string;
}) {
  const { t } = useLanguage();
  const [resetKey, setResetKey] = useState<IntegrationKey | null>(null);

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm leading-6 text-muted">{t("integrations.lead")}</p>
      {integrations.map((status) => (
        <IntegrationCard
          key={status.key}
          status={status}
          googleRedirectUrl={googleRedirectUrl}
          onReset={() => setResetKey(status.key)}
        />
      ))}
      <AdminDialog
        open={resetKey !== null}
        title={resetKey ? t(`integrations.${resetKey}.reset.title` as MessageKey) : ""}
        lead={resetKey ? t(`integrations.${resetKey}.reset.lead` as MessageKey) : ""}
        onClose={() => setResetKey(null)}
      >
        <ResetActions integrationKey={resetKey} onClose={() => setResetKey(null)} />
      </AdminDialog>
    </div>
  );
}

function ResetActions({ integrationKey, onClose }: { integrationKey: IntegrationKey | null; onClose: () => void }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (!integrationKey || pending) return;
    setPending(true);
    const result = await resetIntegration(integrationKey);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    onClose();
    showFeedback({ message: t(`integrations.${integrationKey}.feedback.reset` as MessageKey), variant: "success" });
    router.refresh();
  }

  return (
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-paper px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed">
        {t("actions.cancel")}
      </button>
      <button type="button" onClick={() => void confirm()} disabled={pending} className="rounded-lg bg-game px-4 py-2.5 text-sm font-medium text-white hover:bg-game/90 disabled:cursor-not-allowed disabled:opacity-60">
        {t("integrations.reset")}
      </button>
    </div>
  );
}

function IntegrationCard({
  status,
  googleRedirectUrl,
  onReset,
}: {
  status: IntegrationStatus;
  googleRedirectUrl: string;
  onReset: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const statusKey = `${status.key}:${status.clientId}:${status.replyTo}:${status.configured}:${status.hasSecret}:${status.enabled}`;
  const [seenStatus, setSeenStatus] = useState(statusKey);
  const [expanded, setExpanded] = useState(status.configured);
  const [draft, setDraft] = useState<Draft>({ clientId: status.clientId, secret: "", replyTo: status.replyTo });
  const [pending, setPending] = useState(false);
  if (statusKey !== seenStatus) {
    setSeenStatus(statusKey);
    setDraft({ clientId: status.clientId, secret: "", replyTo: status.replyTo });
    setExpanded(status.configured);
  }

  const dirty = draft.clientId.trim() !== status.clientId || draft.replyTo.trim() !== status.replyTo || draft.secret.trim().length > 0;

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || pending) return;
    setPending(true);
    const result = await saveIntegration(status.key, draft);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t(`integrations.${status.key}.feedback.saved` as MessageKey), variant: "success" });
    router.refresh();
  }

  async function onEnabled(next: boolean) {
    if (!status.configured || pending) return;
    setPending(true);
    const result = await setIntegrationEnabled(status.key, next);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t("integrations.feedback.status_saved"), variant: "success" });
    router.refresh();
  }

  const title = t(`integrations.${status.key}.title` as MessageKey);
  const panelId = `${status.key}-panel`;

  return (
    <section className="rounded-2xl bg-paper ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-3">
        <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((current) => !current)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <Chevron expanded={expanded} />
          <span className="min-w-0">
            <span className="block text-base font-semibold">{title}</span>
            <span className="mt-1 block text-sm text-muted">{t(`integrations.${status.key}.description` as MessageKey)}</span>
          </span>
        </button>
        <span className="flex items-center gap-3" title={status.configured ? undefined : t("integrations.enabled.requires_configured")}>
          <span className="text-sm text-muted">{t("common.active")}</span>
          <Switch checked={status.configured && status.enabled} disabled={pending || !status.configured} label={t(`integrations.${status.key}.aria` as MessageKey)} onChange={(next) => void onEnabled(next)} />
        </span>
      </div>
      <div className="px-5 pb-4">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.configured ? "bg-train-soft text-train" : "bg-ice text-muted"}`}>
          {status.configured ? t("integrations.status.configured") : t("integrations.status.not_configured")}
        </span>
      </div>
      {expanded ? (
        <form id={panelId} onSubmit={(event) => void onSave(event)} className="space-y-4 border-t border-line px-5 pt-4 pb-5">
          <Fields status={status} draft={draft} disabled={pending} onChange={setDraft} />
          {status.key === "google_oauth" ? (
            <div className="rounded-xl bg-ice px-4 py-3 text-sm text-muted">
              <p className="font-medium text-ink">{t("integrations.google_oauth.redirects")}</p>
              <p className="mt-2 font-mono text-xs text-ink">{googleRedirectUrl}</p>
              <p className="mt-2 text-xs">{t("integrations.google_oauth.redirects.hint")}</p>
            </div>
          ) : null}
          <p className="text-xs text-muted">{t(`integrations.${status.key}.hint` as MessageKey)}</p>
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            {status.configured ? (
              <button type="button" onClick={onReset} disabled={pending} className="rounded-lg bg-game-soft px-4 py-2 text-sm font-medium text-game hover:bg-game-soft/80 disabled:cursor-not-allowed disabled:opacity-60">
                {t("integrations.reset")}
              </button>
            ) : null}
            <button type="submit" disabled={pending || !dirty} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
              {t("actions.save")}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function Fields({
  status,
  draft,
  disabled,
  onChange,
}: {
  status: IntegrationStatus;
  draft: Draft;
  disabled: boolean;
  onChange: (next: Draft) => void;
}) {
  const { t } = useLanguage();
  const secretPlaceholder = status.hasSecret ? t("integrations.secret.keep") : t(`integrations.${status.key}.secret.placeholder` as MessageKey);

  if (status.key === "turnstile") {
    return (
      <>
        <TextField id="turnstile-site-key" label={t("integrations.turnstile.site_key")} hint={t("integrations.turnstile.site_key_hint")} value={draft.clientId} placeholder="0x4AAAAAAA…" mono disabled={disabled} onChange={(clientId) => onChange({ ...draft, clientId })} />
        <TextField id="turnstile-secret" label={t("integrations.turnstile.secret")} value={draft.secret} placeholder={secretPlaceholder} mono secret disabled={disabled} onChange={(secret) => onChange({ ...draft, secret })} />
      </>
    );
  }
  if (status.key === "google_oauth") {
    return (
      <>
        <TextField id="google-client-id" label={t("integrations.google_oauth.client_id")} value={draft.clientId} placeholder="1234567890-abcdef.apps.googleusercontent.com" mono disabled={disabled} onChange={(clientId) => onChange({ ...draft, clientId })} />
        <TextField id="google-client-secret" label={t("integrations.google_oauth.client_secret")} value={draft.secret} placeholder={secretPlaceholder} mono secret disabled={disabled} onChange={(secret) => onChange({ ...draft, secret })} />
      </>
    );
  }
  if (status.key === "resend") {
    return (
      <>
        <TextField id="resend-from" label={t("integrations.resend.from")} hint={t("integrations.resend.from_hint")} value={draft.clientId} placeholder="no-reply@example.com" disabled={disabled} onChange={(clientId) => onChange({ ...draft, clientId })} />
        <TextField id="resend-reply" label={t("integrations.resend.reply_to")} hint={t("integrations.resend.reply_to_hint")} value={draft.replyTo} placeholder="hello@gmail.com" disabled={disabled} onChange={(replyTo) => onChange({ ...draft, replyTo })} />
        <TextField id="resend-key" label={t("integrations.resend.api_key")} value={draft.secret} placeholder={secretPlaceholder} mono secret disabled={disabled} onChange={(secret) => onChange({ ...draft, secret })} />
      </>
    );
  }
  if (status.key === "umami") {
    return (
      <>
        <TextField id="umami-website" label={t("integrations.umami.website_id")} value={draft.clientId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" mono disabled={disabled} onChange={(clientId) => onChange({ ...draft, clientId })} />
        <TextField id="umami-script" label={t("integrations.umami.script_url")} value={draft.secret} placeholder={status.hasSecret ? secretPlaceholder : "https://cloud.umami.is/script.js"} mono disabled={disabled} onChange={(secret) => onChange({ ...draft, secret })} />
      </>
    );
  }
  return (
    <>
      <TextField id="sentry-env" label={t("integrations.sentry.environment")} value={draft.clientId} placeholder="production" disabled={disabled} onChange={(clientId) => onChange({ ...draft, clientId })} />
      <TextField id="sentry-dsn" label={t("integrations.sentry.dsn")} value={draft.secret} placeholder={secretPlaceholder} mono secret disabled={disabled} onChange={(secret) => onChange({ ...draft, secret })} />
    </>
  );
}

function TextField({
  id,
  label,
  hint,
  value,
  placeholder,
  onChange,
  disabled,
  secret = false,
  mono = false,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  disabled: boolean;
  secret?: boolean;
  mono?: boolean;
}) {
  return (
    <label htmlFor={id} className="block text-sm font-medium">
      {label}
      <input
        id={id}
        type={secret ? "password" : "text"}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} ${mono ? "font-mono" : ""} placeholder:font-sans`}
      />
      {hint ? <span className="mt-1.5 block text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-navy" : "bg-grid"}`}>
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span className={`mt-0.5 inline-grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ice text-muted transition ${expanded ? "" : "-rotate-90"}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

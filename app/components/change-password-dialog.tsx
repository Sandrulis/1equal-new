"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { changePassword } from "@/app/lib/auth/actions";
import { useLanguage } from "@/app/lib/language";

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSave = !pending && currentPassword.length > 0 && password.length >= 8 && password === confirmPassword && password !== currentPassword;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setPending(true);
    const result = await changePassword(new FormData(event.currentTarget));
    setPending(false);
    if ("error" in result) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t("auth.forgot.done"), variant: "success" });
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label={t("event.close")} className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <form onSubmit={(event) => void onSubmit(event)} className="relative w-full max-w-lg rounded-2xl bg-paper p-6 ring-1 ring-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {t("user.password")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">{t("user.password.lead")}</p>
          </div>
          <button type="button" aria-label={t("event.close")} onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-ice hover:text-ink">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-6 grid gap-3">
          <PasswordField label={t("user.password.current")} name="currentPassword" autoComplete="current-password" value={currentPassword} showLabel={t("auth.password.show")} hideLabel={t("auth.password.hide")} onChange={setCurrentPassword} />
          <PasswordField label={t("auth.forgot.password")} name="password" autoComplete="new-password" value={password} minLength={8} showLabel={t("auth.password.show")} hideLabel={t("auth.password.hide")} onChange={setPassword} />
          <PasswordField label={t("user.password.confirm")} name="confirmPassword" autoComplete="new-password" value={confirmPassword} minLength={8} showLabel={t("auth.password.show")} hideLabel={t("auth.password.hide")} onChange={setConfirmPassword} />
          {mismatch ? <p className="text-sm text-game">{t("user.password.mismatch")}</p> : null}
          {password.length > 0 && password === currentPassword ? <p className="text-sm text-game">{t("user.password.same")}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" disabled={pending} onClick={onClose} className="rounded-lg bg-paper px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:opacity-60">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={!canSave} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60">
            {t("actions.save")}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function PasswordField({
  label,
  name,
  autoComplete,
  value,
  minLength,
  showLabel,
  hideLabel,
  onChange,
}: {
  label: string;
  name: string;
  autoComplete: string;
  value: string;
  minLength?: number;
  showLabel: string;
  hideLabel: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <span className="relative block">
        <input
          required
          name={name}
          value={value}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-lg bg-ice px-3 pr-11 text-sm font-normal ring-1 ring-line"
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-label={visible ? hideLabel : showLabel}
          onClick={() => setVisible((value) => !value)}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2" />
      <path d="M9.9 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4.2" />
      <path d="M6.1 6.1C3.7 7.8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.1-.9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

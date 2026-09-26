"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { resetPassword, signIn, signUp } from "@/app/lib/auth/actions";
import { useLanguage } from "@/app/lib/language";

type Mode = "login" | "signup" | "forgot";

export function AuthScreen({ mode }: { mode: Mode }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = mode === "signup" ? await signUp(formData) : mode === "forgot" ? await resetPassword(formData) : await signIn(formData);
    setPending(false);
    if ("error" in result) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    if ("confirm" in result) {
      showFeedback({ message: t("auth.signup.confirm"), variant: "info" });
      return;
    }
    const doneKey = mode === "signup" ? "auth.signup.done" : mode === "forgot" ? "auth.forgot.done" : "auth.login.done";
    showFeedback({ message: t(doneKey), variant: "success" });
    router.push("/dashboard");
    router.refresh();
  }

  const title = mode === "login" ? t("auth.login.title") : mode === "signup" ? t("auth.signup.title") : t("auth.forgot.title");
  const lead = mode === "login" ? t("auth.login.lead") : mode === "signup" ? t("auth.signup.lead") : t("auth.forgot.lead");

  return (
    <div className="flex min-h-screen flex-col bg-ice">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-paper p-6 ring-1 ring-line sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{lead}</p>
          <form className="mt-6 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
              {mode === "signup" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("auth.firstName")} name="firstName" autoComplete="given-name" />
                  <Field label={t("auth.lastName")} name="lastName" autoComplete="family-name" />
                </div>
              ) : null}
              <Field label={t("auth.email")} name="email" type="email" autoComplete="email" />
              <PasswordField
                label={t(mode === "forgot" ? "auth.forgot.password" : "auth.password")}
                name="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                showLabel={t("auth.password.show")}
                hideLabel={t("auth.password.hide")}
              />
              {mode === "login" ? (
                <Link href="/forgot-password" className="-mt-1 cursor-pointer justify-self-start text-sm text-train hover:underline">
                  {t("auth.forgot.link")}
                </Link>
              ) : null}
              <button type="submit" disabled={pending} className="mt-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60">
                {mode === "login" ? t("auth.login.title") : mode === "signup" ? t("auth.signup.title") : t("auth.forgot.submit")}
              </button>
              {mode === "login" ? (
                <Link href="/signup" className="cursor-pointer text-sm font-medium text-train hover:underline">
                  {t("auth.toSignup")}
                </Link>
              ) : (
                <Link href="/login" className="cursor-pointer text-sm font-medium text-train hover:underline">
                  {mode === "signup" ? t("auth.toLogin") : t("auth.backLogin")}
                </Link>
              )}
            </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function PasswordField({
  label,
  name,
  autoComplete,
  showLabel,
  hideLabel,
}: {
  label: string;
  name: string;
  autoComplete: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <span className="relative block">
        <input
          required
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={8}
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

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="h-11 rounded-lg bg-ice px-3 text-sm font-normal ring-1 ring-line"
      />
    </label>
  );
}

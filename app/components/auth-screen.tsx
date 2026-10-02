"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { PasswordStrengthMeter } from "@/app/components/password-strength-meter";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/app/components/turnstile-widget";
import { resetPassword, signIn, signUp } from "@/app/lib/auth/actions";
import { useLanguage } from "@/app/lib/language";

type Mode = "login" | "signup" | "forgot";

export function AuthScreen({ mode, turnstileSiteKey = null, googleEnabled = false, scriptNonce = "" }: { mode: Mode; turnstileSiteKey?: string | null; googleEnabled?: boolean; scriptNonce?: string }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileRequired = Boolean(turnstileSiteKey);
  const showGoogle = googleEnabled && mode !== "forgot";

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "google") showFeedback({ message: t("auth.google.failed"), variant: "error" });
    if (error === "turnstile" || error === "turnstile_required") {
      showFeedback({ message: t(error === "turnstile_required" ? "auth.turnstile.required" : "auth.turnstile.failed"), variant: "error" });
    }
    if (!error) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [showFeedback, t]);

  function startGoogle() {
    if (turnstileRequired && !turnstileToken) {
      showFeedback({ message: t("auth.turnstile.required"), variant: "error" });
      return;
    }
    setGooglePending(true);
    const url = new URL("/auth/google/sign-in", window.location.origin);
    url.searchParams.set("from", mode === "signup" ? "signup" : "login");
    const remember = formRef.current?.elements.namedItem("remember");
    if (remember instanceof HTMLInputElement && remember.checked) url.searchParams.set("remember", "1");
    if (turnstileToken) url.searchParams.set("turnstile", turnstileToken);
    window.location.assign(url.href);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (turnstileRequired && !turnstileToken) {
      showFeedback({ message: t("auth.turnstile.required"), variant: "error" });
      return;
    }
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = mode === "signup" ? await signUp(formData) : mode === "forgot" ? await resetPassword(formData) : await signIn(formData);
    setPending(false);
    if ("error" in result) {
      showFeedback({ message: t(result.error), variant: "error" });
      turnstileRef.current?.reset();
      return;
    }
    if ("confirm" in result) {
      showFeedback({ message: t("auth.signup.confirm"), variant: "info" });
      return;
    }
    if ("sent" in result) {
      showFeedback({ message: t("auth.forgot.sent"), variant: "success" });
      return;
    }
    if ("needsMfa" in result && result.needsMfa) {
      router.push("/dashboard");
      router.refresh();
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
          <form ref={formRef} className="mt-6 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
              {mode === "signup" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("auth.firstName")} name="firstName" autoComplete="given-name" />
                  <Field label={t("auth.lastName")} name="lastName" autoComplete="family-name" />
                </div>
              ) : null}
              <Field label={t("auth.email")} name="email" type="email" autoComplete="email" />
              {mode === "forgot" ? null : (
              <PasswordField
                label={t("auth.password")}
                name="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                showLabel={t("auth.password.show")}
                hideLabel={t("auth.password.hide")}
                meter={mode === "signup"}
              />
              )}
              {mode === "login" ? (
                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                    <input type="checkbox" name="remember" className="size-4 cursor-pointer accent-navy" />
                    {t("auth.login.remember")}
                  </label>
                  <Link href="/forgot-password" className="cursor-pointer text-sm text-train hover:underline">
                    {t("auth.forgot.link")}
                  </Link>
                </div>
              ) : null}
              {turnstileRequired && turnstileSiteKey ? (
                <>
                  <input type="hidden" name="turnstileToken" value={turnstileToken ?? ""} />
                  <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} nonce={scriptNonce} onTokenChange={setTurnstileToken} />
                </>
              ) : null}
              <button type="submit" disabled={pending || googlePending} className="mt-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60">
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
              {showGoogle ? (
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-line" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">{t("auth.google.or")}</span>
                    <div className="h-px flex-1 bg-line" />
                  </div>
                  <button
                    type="button"
                    disabled={pending || googlePending}
                    onClick={startGoogle}
                    className="flex items-center justify-center gap-2 rounded-lg bg-paper px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:opacity-60"
                  >
                    <GoogleIcon />
                    {googlePending ? t("auth.google.signing_in") : t("auth.google.continue")}
                  </button>
                </div>
              ) : null}
            </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function PasswordField({
  label,
  name,
  autoComplete,
  showLabel,
  hideLabel,
  meter = false,
}: {
  label: string;
  name: string;
  autoComplete: string;
  showLabel: string;
  hideLabel: string;
  meter?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <span className="relative block">
        <input
          required
          name={name}
          value={meter ? value : undefined}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={8}
          onChange={meter ? (event) => setValue(event.target.value) : undefined}
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
      {meter ? <PasswordStrengthMeter password={value} /> : null}
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

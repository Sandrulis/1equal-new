"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SiteHeader } from "@/app/components/site-header";
import { useLanguage } from "@/app/lib/language";

type Mode = "login" | "signup" | "forgot";

export function AuthScreen({ mode }: { mode: Mode }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "forgot") {
      setSent(true);
      return;
    }
    router.push("/dashboard");
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
          {sent ? (
            <div className="mt-6">
              <p className="rounded-lg bg-train-soft px-3 py-3 text-sm leading-6 text-train">{t("auth.forgot.sent")}</p>
              <Link href="/login" className="mt-4 inline-flex cursor-pointer text-sm font-medium text-train hover:underline">
                {t("auth.backLogin")}
              </Link>
            </div>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              {mode === "signup" ? <Field label={t("auth.name")} name="name" autoComplete="name" /> : null}
              <Field label={t("auth.email")} name="email" type="email" autoComplete="email" />
              {mode === "forgot" ? null : (
                <Field
                  label={t("auth.password")}
                  name="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              )}
              {mode === "login" ? (
                <Link href="/forgot-password" className="-mt-1 cursor-pointer justify-self-start text-sm text-train hover:underline">
                  {t("auth.forgot.link")}
                </Link>
              ) : null}
              <button type="submit" className="mt-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90">
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
          )}
        </div>
      </main>
    </div>
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

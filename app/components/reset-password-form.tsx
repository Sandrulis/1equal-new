"use client";

import { useState, type FormEvent } from "react";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { setNewPassword } from "@/app/lib/auth/actions";
import { useLanguage } from "@/app/lib/language";

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await setNewPassword(new FormData(event.currentTarget));
    setPending(false);
    if ("error" in result) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    setDone(true);
    showFeedback({ message: t("auth.forgot.done"), variant: "success" });
  }

  return (
    <form className="grid w-full max-w-md gap-4 rounded-2xl bg-paper p-6 ring-1 ring-line" onSubmit={(event) => void onSubmit(event)}>
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.reset.title")}</h1>
      <p className="text-sm leading-6 text-muted">{t("auth.reset.lead")}</p>
      <label className="grid gap-1.5 text-sm font-medium">
        {t("auth.forgot.password")}
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className="rounded-lg bg-ice px-3 py-2 font-normal ring-1 ring-line" />
      </label>
      <button type="submit" disabled={pending || done} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60">
        {t("auth.reset.submit")}
      </button>
    </form>
  );
}

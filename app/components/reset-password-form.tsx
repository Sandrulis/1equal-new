"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthNoticeModal } from "@/app/components/auth-notice-modal";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { PasswordStrengthMeter } from "@/app/components/password-strength-meter";
import { setNewPassword } from "@/app/lib/auth/actions";
import { useLanguage } from "@/app/lib/language";

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");

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
  }

  return (
    <form className="grid w-full max-w-md gap-4 rounded-2xl bg-paper p-6 ring-1 ring-line" onSubmit={(event) => void onSubmit(event)}>
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.reset.title")}</h1>
      <p className="text-sm leading-6 text-muted">{t("auth.reset.lead")}</p>
      <label className="grid gap-1.5 text-sm font-medium">
        {t("auth.forgot.password")}
        <input name="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg bg-ice px-3 py-2 font-normal ring-1 ring-line" />
        <PasswordStrengthMeter password={password} />
      </label>
      <button type="submit" disabled={pending || done} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60">
        {t("auth.reset.submit")}
      </button>
      <AuthNoticeModal
        open={done}
        title={t("auth.reset.done_modal.title")}
        description={t("auth.reset.done_modal.description")}
        body={t("auth.reset.done_modal.body")}
        onLeave={() => router.replace("/")}
      />
    </form>
  );
}

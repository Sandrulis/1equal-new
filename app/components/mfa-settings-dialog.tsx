"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ContentImage } from "@/app/components/content-image";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { OtpCodeInput } from "@/app/components/otp-code-input";
import { useLanguage } from "@/app/lib/language";
import { createBrowserSupabase } from "@/app/lib/supabase/browser";

function qrSrc(value: string) {
  if (value.startsWith("data:")) return value;
  if (value.trim().startsWith("<svg")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
  return "";
}

export function MfaSettingsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const codeLabelId = useId();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [otpNonce, setOtpNonce] = useState(0);
  const factorIdRef = useRef<string | null>(null);
  const verifyingRef = useRef(false);
  useEffect(() => {
    factorIdRef.current = factorId;
  }, [factorId]);

  useEffect(() => {
    void (async () => {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp ?? []).find((item) => item.status === "verified");
      setEnabled(Boolean(verified));
      if (verified) setFactorId(verified.id);
    })();
  }, []);

  async function enroll() {
    setPending(true);
    const supabase = createBrowserSupabase();
    const listed = await supabase.auth.mfa.listFactors();
    for (const item of listed.data?.totp ?? []) {
      if (item.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: item.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "1Equal" });
    setPending(false);
    if (error || !data) {
      showFeedback({ message: t("auth.mfa.invalid"), variant: "error" });
      return;
    }
    setFactorId(data.id);
    setSecret(data.totp.secret);
    setQr(qrSrc(data.totp.qr_code));
  }

  async function verify(raw?: string) {
    const digits = (raw ?? code).replace(/\D/g, "").slice(0, 6);
    const currentFactorId = factorIdRef.current;
    if (!currentFactorId || digits.length < 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setPending(true);
    const supabase = createBrowserSupabase();
    const challenge = await supabase.auth.mfa.challenge({ factorId: currentFactorId });
    if (challenge.error || !challenge.data) {
      verifyingRef.current = false;
      setPending(false);
      setCode("");
      setOtpNonce((value) => value + 1);
      showFeedback({ message: t("auth.mfa.code_invalid"), variant: "error" });
      return;
    }
    const verified = await supabase.auth.mfa.verify({ factorId: currentFactorId, challengeId: challenge.data.id, code: digits });
    setPending(false);
    if (verified.error) {
      verifyingRef.current = false;
      setCode("");
      setOtpNonce((value) => value + 1);
      showFeedback({ message: t("auth.mfa.code_invalid"), variant: "error" });
      return;
    }
    verifyingRef.current = false;
    setEnabled(true);
    setQr("");
    setSecret("");
    setCode("");
    showFeedback({ message: t("auth.mfa.enabled"), variant: "success" });
  }

  async function unenroll() {
    if (!factorId) return;
    setPending(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setPending(false);
    if (error) {
      showFeedback({ message: t("auth.mfa.invalid"), variant: "error" });
      return;
    }
    setEnabled(false);
    setFactorId(null);
    showFeedback({ message: t("auth.mfa.disabled"), variant: "success" });
  }

  const image = qrSrc(qr);

  return (
    <AdminDialog open closeButton title={t("auth.mfa.title")} lead={t("auth.mfa.subtitle")} onClose={onClose}>
      <div className="space-y-4">
        {image ? <ContentImage src={image} alt={t("auth.mfa.qr_alt")} className="h-40 w-40" /> : null}
        {secret ? (
          <p className="text-sm text-zinc-600">
            {t("auth.mfa.secret")}: <code className="font-mono text-xs">{secret}</code>
          </p>
        ) : null}
        {secret ? (
          <div aria-busy={pending}>
            <span id={codeLabelId} className="block text-center text-sm font-semibold text-zinc-700">
              {t("auth.mfa.code")}
            </span>
            <OtpCodeInput key={otpNonce} id="mfa-settings-code" value={code} onChange={setCode} onComplete={(next) => void verify(next)} disabled={pending} autoFocus labelledBy={codeLabelId} />
          </div>
        ) : null}
        {enabled && !secret ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">{t("auth.mfa.enabled")}</p>
            <button type="button" disabled={pending} onClick={() => void unenroll()} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60">
              {t("auth.mfa.unenroll")}
            </button>
          </div>
        ) : null}
        {!enabled && !secret ? (
          <button type="button" disabled={pending} onClick={() => void enroll()} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
            {t("auth.mfa.enroll")}
          </button>
        ) : null}
      </div>
    </AdminDialog>
  );
}

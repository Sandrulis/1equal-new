"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OtpCodeInput } from "@/app/components/otp-code-input";
import { signOut } from "@/app/lib/auth/actions";
import { useLanguage } from "@/app/lib/language";
import { createBrowserSupabase } from "@/app/lib/supabase/browser";

type VerifyStatus = "idle" | "pending" | "success" | "error";

const RESULT_HOLD_MS = 900;

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function MfaLoginGate() {
  const { t } = useLanguage();
  const router = useRouter();
  const codeLabelId = useId();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [otpNonce, setOtpNonce] = useState(0);
  const factorIdRef = useRef<string | null>(null);
  const verifyingRef = useRef(false);
  const queuedCodeRef = useRef<string | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = verifyStatus !== "idle";
  factorIdRef.current = factorId;

  function clearResultTimer() {
    if (!resultTimerRef.current) return;
    clearTimeout(resultTimerRef.current);
    resultTimerRef.current = null;
  }

  useEffect(() => () => clearResultTimer(), []);

  useEffect(() => {
    void (async () => {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp ?? []).find((item) => item.status === "verified");
      setFactorId(verified?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!factorId || !queuedCodeRef.current) return;
    void verifyCode(queuedCodeRef.current);
  }, [factorId]);

  async function verifyCode(raw: string) {
    const digits = onlyDigits(raw);
    if (digits.length < 6) return;
    queuedCodeRef.current = digits;
    const currentFactorId = factorIdRef.current;
    if (!currentFactorId || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifyStatus("pending");
    const supabase = createBrowserSupabase();
    const challenge = await supabase.auth.mfa.challenge({ factorId: currentFactorId });
    if (challenge.error || !challenge.data) {
      showVerifyError();
      return;
    }
    const verified = await supabase.auth.mfa.verify({
      factorId: currentFactorId,
      challengeId: challenge.data.id,
      code: digits,
    });
    if (verified.error) {
      showVerifyError();
      return;
    }
    setVerifyStatus("success");
    clearResultTimer();
    resultTimerRef.current = setTimeout(() => router.refresh(), RESULT_HOLD_MS);
  }

  function showVerifyError() {
    setVerifyStatus("error");
    clearResultTimer();
    resultTimerRef.current = setTimeout(() => {
      verifyingRef.current = false;
      queuedCodeRef.current = null;
      setVerifyStatus("idle");
      setCode("");
      setOtpNonce((value) => value + 1);
    }, RESULT_HOLD_MS);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50 p-4">
      <div className="absolute inset-0 bg-zinc-900/40" aria-hidden />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">{t("auth.mfa.title")}</h1>
            <p className="mt-1 text-sm text-zinc-500">{t("auth.mfa.verify_login")}</p>
          </div>
          <button type="button" disabled={pending} onClick={() => void signOut()} className="shrink-0 rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed">
            {t("user.logout")}
          </button>
        </div>
        <div className="mt-6" aria-busy={verifyStatus === "pending"}>
          <span id={codeLabelId} className="block text-center text-sm font-semibold text-zinc-700">
            {t("auth.mfa.code")}
          </span>
          <OtpCodeInput
            key={otpNonce}
            id="mfa-login-code"
            value={code}
            onChange={setCode}
            onComplete={(next) => void verifyCode(next)}
            disabled={pending}
            autoFocus
            labelledBy={codeLabelId}
          />
          {verifyStatus === "idle" ? null : (
            <p
              className={`mt-3 flex min-h-7 items-center justify-center gap-2 text-sm ${
                verifyStatus === "success" ? "text-emerald-600" : verifyStatus === "error" ? "text-red-600" : "text-zinc-500"
              }`}
              role="status"
              aria-live="polite"
            >
              <StatusMark status={verifyStatus} />
              <span>
                {verifyStatus === "success" ? t("auth.login.done") : verifyStatus === "error" ? t("auth.mfa.code_invalid") : t("auth.mfa.loading")}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusMark({ status }: { status: VerifyStatus }) {
  return (
    <span className="relative inline-flex size-6 items-center justify-center">
      <span className={`absolute size-4 rounded-full border-2 border-zinc-300 border-t-zinc-500 ${status === "pending" ? "animate-spin opacity-100" : "scale-50 opacity-0"}`} />
      <span className={`absolute text-lg text-emerald-600 ${status === "success" ? "mfa-verify-result-in" : "scale-50 opacity-0"}`} aria-hidden>
        ✓
      </span>
      <span className={`absolute text-lg text-red-600 ${status === "error" ? "mfa-verify-result-in" : "scale-50 opacity-0"}`} aria-hidden>
        ×
      </span>
    </span>
  );
}

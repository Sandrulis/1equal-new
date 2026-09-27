"use client";

import { Fragment, useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { useLanguage } from "@/app/lib/language";

const OTP_LENGTH = 6;
const GROUP_SIZE = 3;

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

function digitAt(value: string, index: number) {
  return onlyDigits(value)[index] ?? "";
}

export function OtpCodeInput({
  id,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  labelledBy,
  onComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  labelledBy?: string;
  onComplete?: (code: string) => void;
}) {
  const { t } = useLanguage();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = onlyDigits(value);
  const onCompleteRef = useRef(onComplete);
  const digitsRef = useRef(digits);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    digitsRef.current = digits;
  });

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const firstEmpty = Math.min(digitsRef.current.length, OTP_LENGTH - 1);
    const frame = requestAnimationFrame(() => {
      refs.current[firstEmpty]?.focus();
      refs.current[firstEmpty]?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, disabled]);

  function setDigits(next: string, focusIndex: number) {
    const filled = onlyDigits(next);
    onChange(filled);
    const clamped = Math.max(0, Math.min(focusIndex, OTP_LENGTH - 1));
    requestAnimationFrame(() => {
      refs.current[clamped]?.focus();
      refs.current[clamped]?.select();
    });
    if (filled.length === OTP_LENGTH) onCompleteRef.current?.(filled);
  }

  function handleChange(index: number, raw: string) {
    const incoming = onlyDigits(raw);
    if (!incoming) {
      const next = digits.split("");
      next[index] = "";
      setDigits(next.join(""), index);
      return;
    }
    const next = digits.padEnd(OTP_LENGTH, " ").split("");
    for (let offset = 0; offset < incoming.length && index + offset < OTP_LENGTH; offset += 1) {
      next[index + offset] = incoming[offset] ?? "";
    }
    setDigits(next.join("").replace(/ /g, ""), index + incoming.length);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digitAt(digits, index) && index > 0) {
      event.preventDefault();
      const next = digits.split("");
      next[index - 1] = "";
      setDigits(next.join(""), index - 1);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = onlyDigits(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    setDigits(pasted, pasted.length);
  }

  return (
    <div id={id} role="group" aria-labelledby={labelledBy} className="mt-2 flex items-center justify-center gap-2 min-[600px]:gap-4">
      {[0, GROUP_SIZE].map((start, groupIndex) => (
        <Fragment key={start}>
          {groupIndex > 0 ? (
            <span className="select-none text-xl font-medium text-zinc-300" aria-hidden>
              -
            </span>
          ) : null}
          <div className="flex gap-1.5 min-[600px]:gap-2">
            {Array.from({ length: GROUP_SIZE }, (_, offset) => {
              const index = start + offset;
              return (
                <input
                  key={index}
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  name={index === 0 ? "one-time-code" : undefined}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={OTP_LENGTH}
                  disabled={disabled}
                  aria-label={t("auth.mfa.digit", { index: index + 1, total: OTP_LENGTH })}
                  value={digitAt(digits, index)}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-12 w-9 rounded-xl border border-zinc-200 bg-zinc-50 text-center text-lg font-semibold text-zinc-900 tabular-nums outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 min-[600px]:h-14 min-[600px]:w-12 min-[600px]:text-xl"
                />
              );
            })}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

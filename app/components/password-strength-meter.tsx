"use client";

import { getPasswordStrength, type PasswordStrengthLevel } from "@/app/lib/auth/password-strength";
import { useLanguage } from "@/app/lib/language";
import type { MessageKey } from "@/app/lib/messages";

const LEVEL_KEYS: Record<PasswordStrengthLevel, MessageKey> = {
  very_weak: "auth.password.very_weak",
  weak: "auth.password.weak",
  fair: "auth.password.fair",
  good: "auth.password.good",
  strong: "auth.password.strong",
};

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { t } = useLanguage();
  const strength = getPasswordStrength(password);
  if (!strength) return null;

  return (
    <div className="grid gap-1" aria-live="polite">
      <div className="h-1 overflow-hidden rounded-sm bg-line" role="presentation">
        <div
          className="h-full rounded-sm transition-all duration-300 ease-out"
          style={{ width: `${strength.percent}%`, backgroundColor: strength.color }}
        />
      </div>
      <p className="text-xs font-medium" style={{ color: strength.color }}>
        {t("auth.password.strength")}: {t(LEVEL_KEYS[strength.level])}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useLanguage } from "@/app/lib/language";
import { sportLabel, type Sport, type SportIcon } from "@/app/lib/sports";

export function SportIcon({ icon }: { icon: SportIcon }) {
  if (icon === "ball") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4c2 2.5 2 13.5 0 16M4 12c2.5-2 13.5-2 16 0" />
      </svg>
    );
  }
  if (icon === "basket") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 12h14M7 12c1 5 3 8 5 8s4-3 5-8" />
      </svg>
    );
  }
  if (icon === "racket") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <ellipse cx="10" cy="9" rx="5" ry="6" />
        <path d="M14 14l6 6" />
      </svg>
    );
  }
  if (icon === "swim") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 15c2 1 3-1 5 0s3-1 5 0 3-1 5 0 3-1 5 0" />
        <path d="M3 19c2 1 3-1 5 0s3-1 5 0 3-1 5 0 3-1 5 0" />
      </svg>
    );
  }
  if (icon === "run") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="15" cy="5" r="2" />
        <path d="M8 21l3-6 3 2 3-5M10 11l4 1 2 3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 5v14M8 9h8" />
    </svg>
  );
}

export function SportSwitch({
  sports,
  value,
  onChange,
  disabled = false,
}: {
  sports: Sport[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { t, lang, languages } = useLanguage();
  const fallback = languages.find((language) => language.isDefault)?.code ?? lang;
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);

  function place(target: HTMLButtonElement, text: string) {
    const box = target.getBoundingClientRect();
    const below = box.top < 40;
    const x = Math.min(window.innerWidth - 12, Math.max(12, box.left + box.width / 2));
    setTip({ text, x, y: below ? box.bottom + 6 : box.top - 6, below });
  }

  if (sports.length < 2) return null;

  return (
    <div className="inline-flex w-fit rounded-lg bg-paper p-1 shadow-sm ring-1 ring-line" role="group" aria-label={t("sports.field")}>
      {sports.map((sport) => {
        const label = sportLabel(sport, lang, fallback);
        const active = value === sport.id;
        return (
          <button
            key={sport.id}
            type="button"
            aria-pressed={active}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(sport.id)}
            onMouseEnter={(event) => place(event.currentTarget, label)}
            onMouseLeave={() => setTip(null)}
            onFocus={(event) => place(event.currentTarget, label)}
            onBlur={() => setTip(null)}
            className={`grid h-9 w-11 place-items-center rounded-md disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-navy text-white shadow-sm" : "text-muted hover:bg-ice hover:text-ink"}`}
          >
            <SportIcon icon={sport.icon} />
          </button>
        );
      })}
      {tip ? (
        <span
          role="tooltip"
          style={{ left: tip.x, top: tip.y, transform: tip.below ? "translateX(-50%)" : "translate(-50%, -100%)" }}
          className="pointer-events-none fixed z-40 rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
        >
          {tip.text}
        </span>
      ) : null}
    </div>
  );
}

export function SportField({
  sports,
  value,
  onChange,
  disabled = false,
}: {
  sports: Sport[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const active = sports.filter((sport) => sport.isActive);
  if (active.length < 2) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{t("sports.field")}</span>
      <SportSwitch sports={active} value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

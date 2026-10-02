"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faIconDefinition } from "@/app/lib/fa-icons";
import { useLanguage } from "@/app/lib/language";
import { sportLabel, type Sport } from "@/app/lib/sports";

export function SportIcon({ icon }: { icon: string }) {
  const [definition, setDefinition] = useState<IconDefinition | null>(null);
  useEffect(() => {
    let active = true;
    void faIconDefinition(icon).then((found) => {
      if (active) setDefinition(found);
    });
    return () => {
      active = false;
    };
  }, [icon]);
  if (!definition) return <span className="inline-block size-4" aria-hidden="true" />;
  return <FontAwesomeIcon icon={definition} className="size-4" />;
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

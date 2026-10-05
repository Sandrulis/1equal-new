"use client";

import { useMemo } from "react";
import { useLanguage } from "@/app/lib/language";
import { NAME_LETTERS, nameLetter } from "@/app/lib/name-letter";

export function LetterFilter({
  value,
  names,
  onChange,
}: {
  value: string | null;
  names: string[];
  onChange: (letter: string | null) => void;
}) {
  const { t } = useLanguage();
  const counts = useMemo(() => {
    const next: Record<string, number> = { "#": 0 };
    for (const letter of NAME_LETTERS) next[letter] = 0;
    for (const name of names) {
      const letter = nameLetter(name);
      if (letter) next[letter] = (next[letter] ?? 0) + 1;
    }
    return next;
  }, [names]);

  const items: { id: string | null; label: string; ariaLabel?: string }[] = [
    { id: null, label: t("admin.filter.all") },
    ...NAME_LETTERS.map((letter) => ({ id: letter, label: letter, ariaLabel: t("admin.filter.letter", { letter }) })),
    { id: "#", label: "#", ariaLabel: t("admin.filter.digits") },
  ];

  return (
    <div className="mb-4 inline-flex max-w-full flex-wrap rounded-2xl border border-line bg-ice p-1" role="group" aria-label={t("admin.filter.letters")}>
      {items.map((item) => {
        const active = item.id === value;
        const empty = item.id !== null && (counts[item.id] ?? 0) === 0;
        return (
          <button
            key={item.id ?? "all"}
            type="button"
            aria-pressed={active}
            aria-label={item.ariaLabel}
            disabled={empty}
            onClick={() => onChange(item.id)}
            className={`min-w-8 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold ${
              active ? "bg-paper text-ink shadow-sm" : empty ? "text-grid" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

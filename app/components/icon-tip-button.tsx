"use client";

import { useState, type ReactNode } from "react";

type Tone = "train" | "game" | "muted";

const toneClass: Record<Tone, string> = {
  train: "text-train hover:bg-train-soft",
  game: "text-game hover:bg-game-soft",
  muted: "text-muted hover:bg-ice",
};

export function IconTipButton({
  label,
  tone = "train",
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  tone?: Tone;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; below: boolean } | null>(null);

  function place(target: HTMLButtonElement) {
    const box = target.getBoundingClientRect();
    const below = box.top < 40;
    const x = Math.min(window.innerWidth - 12, Math.max(12, box.left + box.width / 2));
    setTip({ x, y: below ? box.bottom + 6 : box.top - 6, below });
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={(event) => place(event.currentTarget)}
        onMouseLeave={() => setTip(null)}
        onFocus={(event) => place(event.currentTarget)}
        onBlur={() => setTip(null)}
        className={`grid h-8 w-8 place-items-center rounded-lg ${toneClass[tone]}`}
      >
        {children}
      </button>
      {tip ? (
        <span
          role="tooltip"
          style={{
            left: tip.x,
            top: tip.y,
            transform: tip.below ? "translateX(-50%)" : "translate(-50%, -100%)",
          }}
          className="pointer-events-none fixed z-40 rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
        >
          {label}
        </span>
      ) : null}
    </>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconPlus() {
  return (
    <Svg>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconPencil() {
  return (
    <Svg>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}

export function IconTrash() {
  return (
    <Svg>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M18 7l-1 13H7L6 7" />
    </Svg>
  );
}

export function IconX() {
  return (
    <Svg>
      <path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

export function IconCheck() {
  return (
    <Svg>
      <path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

export function IconLogout() {
  return (
    <Svg>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  );
}

export function IconChevronLeft() {
  return (
    <Svg>
      <path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

export function IconChevronRight() {
  return (
    <Svg>
      <path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

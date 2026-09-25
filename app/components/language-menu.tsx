"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "@/app/lib/language";
import type { Lang } from "@/app/lib/messages";

const LANGUAGES: { id: Lang; name: string }[] = [
  { id: "lv", name: "Latviešu" },
  { id: "en", name: "English" },
];

export function LanguageMenu() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = LANGUAGES.find((item) => item.id === lang) ?? LANGUAGES[0];

  return (
    <div ref={rootRef} className="relative">
      <FlagTip name={current.name}>
        <button
          type="button"
          aria-label={current.name}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-9 items-center rounded-lg bg-paper px-2 ring-1 ring-line hover:bg-ice"
        >
          <Flag code={current.id} />
        </button>
      </FlagTip>
      {open ? (
        <div
          role="listbox"
          aria-label={current.name}
          className="absolute right-0 z-20 mt-1 flex min-w-36 flex-col gap-0.5 rounded-xl bg-paper p-1 ring-1 ring-line"
        >
          {LANGUAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === lang}
              onClick={() => {
                setLang(item.id);
                setOpen(false);
              }}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                item.id === lang ? "bg-ice ring-1 ring-train" : "hover:bg-ice"
              }`}
            >
              <Flag code={item.id} />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FlagTip({ name, children }: { name: string; children: ReactNode }) {
  const tipRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  function place() {
    const tip = tipRef.current;
    if (!tip) return;
    tip.style.transform = "translateX(-50%)";
    const rect = tip.getBoundingClientRect();
    const pad = 8;
    let next = 0;
    if (rect.right > window.innerWidth - pad) next -= rect.right - (window.innerWidth - pad);
    if (rect.left + next < pad) next += pad - (rect.left + next);
    setShift(next);
  }

  return (
    <span className="group relative inline-flex" onMouseEnter={place} onFocus={place}>
      {children}
      <span
        ref={tipRef}
        role="tooltip"
        style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 group-hover:opacity-100"
      >
        {name}
      </span>
    </span>
  );
}

function Flag({ code }: { code: Lang }) {
  return (
    <span className="inline-block h-[12.6px] w-[22.68px] shrink-0 overflow-hidden rounded-[2px]">
      {code === "lv" ? <FlagLv /> : <FlagGb />}
    </span>
  );
}

function FlagLv() {
  return (
    <svg viewBox="0 0 30 15" className="block h-full w-full" aria-hidden="true">
      <rect width="30" height="15" fill="#9E3039" />
      <rect y="6" width="30" height="3" fill="#fff" />
    </svg>
  );
}

function FlagGb() {
  return (
    <svg viewBox="0 0 60 30" className="block h-full w-full" aria-hidden="true">
      <path fill="#012169" d="M0 0h60v30H0z" />
      <path stroke="#fff" strokeWidth="6" d="M0 0l60 30M60 0L0 30" />
      <path stroke="#C8102E" strokeWidth="4" d="M0 0l60 30M60 0L0 30" />
      <path stroke="#fff" strokeWidth="10" d="M30 0v30M0 15h60" />
      <path stroke="#C8102E" strokeWidth="6" d="M30 0v30M0 15h60" />
    </svg>
  );
}

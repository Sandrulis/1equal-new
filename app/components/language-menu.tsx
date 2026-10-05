"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/lib/language";
import { claimMobileMenu, releaseMobileMenu, useExclusiveMobileMenu } from "@/app/lib/mobile-menu";
import { useNarrow, useHeaderBottom, usePresence } from "@/app/lib/use-presence";

export function LanguageMenu() {
  const { t, lang, languages, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrow();
  const sheet = usePresence(open && narrow);
  const sheetTop = useHeaderBottom(sheet.mounted, rootRef);
  useExclusiveMobileMenu("language", open, () => setOpen(false));

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

  const current = languages.find((item) => item.code === lang) ?? languages[0];

  function languageOptions() {
    return languages.map((item) => (
      <button
        key={item.code}
        type="button"
        role="option"
        aria-selected={item.code === lang}
        onClick={() => {
          setLang(item.code);
          setOpen(false);
        }}
        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${item.code === lang ? "bg-ice ring-1 ring-train" : "hover:bg-ice"}`}
      >
        <Flag code={item.code} />
        <span>{item.name}</span>
      </button>
    ));
  }

  return (
    <div ref={rootRef} className="relative">
      <FlagTip name={current.name}>
        <button
          type="button"
          aria-label={current.name}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => {
            const next = !open;
            if (next) claimMobileMenu("language");
            else releaseMobileMenu("language");
            setOpen(next);
          }}
          className="inline-flex h-9 items-center rounded-lg bg-paper px-2 ring-1 ring-line hover:bg-ice"
        >
          <Flag code={current.code} />
        </button>
      </FlagTip>
      {open && !narrow ? (
        <div role="listbox" aria-label={current.name} className="absolute right-0 z-20 mt-1 flex min-w-36 flex-col gap-0.5 rounded-xl bg-paper p-1 ring-1 ring-line">
          {languageOptions()}
        </div>
      ) : null}
      {sheet.mounted ? (
        <>
          <button type="button" aria-label={t("event.close")} onClick={() => setOpen(false)} style={{ top: sheetTop }} className={`fixed inset-x-0 bottom-0 z-30 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ${sheet.shown ? "opacity-100" : "pointer-events-none opacity-0"}`} />
          <div style={{ top: sheetTop }} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 overflow-hidden">
            <div role="listbox" aria-label={current.name} className={`pointer-events-auto flex flex-col gap-0.5 bg-paper p-1 shadow-lg transition-transform duration-200 ${sheet.shown ? "translate-y-0" : "-translate-y-full"}`}>
              {languageOptions()}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function FlagTip({ name, children }: { name: string; children: ReactNode }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [shift, setShift] = useState(0);

  function place() {
    const box = anchorRef.current?.getBoundingClientRect();
    if (!box) return;
    setPos({ x: box.left + box.width / 2, y: box.bottom + 4 });
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const tip = tipRef.current;
    if (!tip) return;
    const rect = tip.getBoundingClientRect();
    const pad = 8;
    let next = 0;
    if (rect.right > window.innerWidth - pad) next -= rect.right - (window.innerWidth - pad);
    if (rect.left + next < pad) next += pad - (rect.left + next);
    setShift(next);
  }, [open, pos]);

  return (
    <span ref={anchorRef} className="relative inline-flex" onMouseEnter={place} onMouseLeave={() => setOpen(false)} onFocus={place} onBlur={() => setOpen(false)}>
      {children}
      {open
        ? createPortal(
            <span
              ref={tipRef}
              role="tooltip"
              style={{ left: pos.x, top: pos.y, transform: `translateX(calc(-50% + ${shift}px))` }}
              className="pointer-events-none fixed z-[80] rounded-md bg-navy px-2 py-1 text-xs font-medium whitespace-nowrap text-white"
            >
              {name}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

function Flag({ code }: { code: string }) {
  return (
    <span className="inline-grid h-[12.6px] w-[22.68px] shrink-0 place-items-center overflow-hidden rounded-[2px] bg-ice text-[8px] font-semibold text-ink">
      {code === "lv" ? <FlagLv /> : code === "en" ? <FlagGb /> : code === "ru" ? <FlagRu /> : code.slice(0, 2).toUpperCase()}
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

function FlagRu() {
  return (
    <svg viewBox="0 0 30 15" className="block h-full w-full" aria-hidden="true">
      <rect width="30" height="5" fill="#fff" />
      <rect y="5" width="30" height="5" fill="#0039A6" />
      <rect y="10" width="30" height="5" fill="#D52B1E" />
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

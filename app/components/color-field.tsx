"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

type Hsv = { h: number; s: number; v: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToHsv(hex: string): Hsv | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const part = (channel: number) => clamp(Math.round((channel + m) * 255), 0, 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function point(event: ReactPointerEvent<HTMLElement>): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
}

export function ColorField({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 190, s: 0.82, v: 0.51 });
  const [hex, setHex] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastHex = useRef(value.toLowerCase());

  useEffect(() => {
    const next = value.toLowerCase();
    if (next === lastHex.current) return;
    const parsed = hexToHsv(value);
    if (!parsed) return;
    setHsv(parsed);
    setHex(next);
    lastHex.current = next;
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function commit(next: Hsv) {
    const color = hsvToHex(next);
    setHsv(next);
    setHex(color);
    lastHex.current = color;
    onChange(color);
  }

  function onHex(raw: string) {
    const next = raw.startsWith("#") ? raw : `#${raw}`;
    setHex(next.slice(0, 7));
    const parsed = hexToHsv(next);
    if (!parsed) return;
    const color = hsvToHex(parsed);
    setHsv(parsed);
    lastHex.current = color;
    onChange(color);
  }

  const swatch = (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      className={`h-10 w-10 shrink-0 rounded-xl ring-1 ring-line ${open ? "ring-2 ring-navy" : ""}`}
      style={{ background: /^#[0-9a-f]{6}$/i.test(value) ? value : "#0f6e82" }}
    />
  );

  return (
    <div ref={rootRef} className="block text-sm">
      {children ? (
        <div className="flex items-end gap-2">
          {swatch}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        <>
          <span className="text-muted">{label}</span>
          <div className="mt-1">{swatch}</div>
        </>
      )}
      {open ? (
        <div className="mt-3 rounded-2xl bg-ice p-3 ring-1 ring-line">
          <div
            role="slider"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv.s * 100)}
            className="relative h-36 cursor-crosshair touch-none rounded-xl"
            style={{
              backgroundColor: `hsl(${hsv.h} 100% 50%)`,
              backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              const { x, y } = point(event);
              commit({ ...hsv, s: x, v: 1 - y });
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const { x, y } = point(event);
              commit({ ...hsv, s: x, v: 1 - y });
            }}
          >
            <span
              className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex(hsv) }}
            />
          </div>
          <div
            role="slider"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            className="relative mt-3 h-3 cursor-pointer touch-none rounded-full"
            style={{ background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              commit({ ...hsv, h: point(event).x * 360 });
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              commit({ ...hsv, h: point(event).x * 360 });
            }}
          >
            <span
              className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
              style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }}
            />
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-lg bg-paper px-3 py-2 ring-1 ring-line focus-within:ring-train">
            <span className="text-muted">#</span>
            <input
              value={hex.replace(/^#/, "")}
              onChange={(event) => onHex(event.target.value)}
              spellCheck={false}
              maxLength={6}
              aria-label={label}
              className="w-full bg-transparent font-mono text-sm tracking-wide text-ink uppercase outline-none"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SportIcon } from "@/app/components/sport-switch";
import { searchFaIcons, type FaIconHit } from "@/app/lib/fa-icons";
import { useLanguage } from "@/app/lib/language";

const ROW_HEIGHT = 40;
const VIEW_HEIGHT = 320;

export function SportIconPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [icons, setIcons] = useState<FaIconHit[]>([]);
  const ready = useRef(false);

  function openPicker() {
    if (!ready.current) setLoading(true);
    setOpened(true);
  }

  useEffect(() => {
    if (!opened) return;
    let active = true;
    let outer = 0;
    let inner = 0;
    const first = !ready.current;
    const run = () => {
      void searchFaIcons(query).then((found) => {
        if (!active) return;
        ready.current = true;
        setIcons(found);
        setLoading(false);
      });
    };
    if (first) {
      outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(run);
      });
    } else run();
    return () => {
      active = false;
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [opened, query]);

  return (
    <div>
      <label className="block text-sm">
        <span className="text-muted">{t("sports.icon")}</span>
        <span className="relative mt-1.5 flex items-center gap-2">
          <span title={value} className="grid h-9 w-11 shrink-0 place-items-center rounded-md bg-navy text-white">
            <SportIcon icon={value} />
          </span>
          <input
            value={query}
            disabled={disabled}
            onFocus={openPicker}
            onChange={(event) => {
              openPicker();
              setQuery(event.target.value);
            }}
            placeholder={t("sports.icon.search")}
            aria-busy={loading}
            className={`w-full rounded-lg bg-ice py-2.5 pr-10 pl-3 text-sm text-ink ring-1 ring-line outline-none placeholder:text-muted focus:ring-train disabled:opacity-60`}
          />
          {loading ? <IconSpinner className="absolute top-1/2 right-3 -translate-y-1/2" /> : null}
        </span>
      </label>
      {loading ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted" role="status">
          <IconSpinner />
          {t("sports.icon.loading")}
        </p>
      ) : null}
      {!loading && query.trim() && icons.length === 0 ? <p className="mt-2 text-sm text-muted">{t("sports.icon.empty")}</p> : null}
      {!loading && icons.length > 0 ? (
        <IconGrid key={query} icons={icons} value={value} disabled={disabled} label={t("sports.icon")} onChange={onChange} />
      ) : null}
    </div>
  );
}

function IconGrid({
  icons,
  value,
  disabled,
  label,
  onChange,
}: {
  icons: FaIconHit[];
  value: string;
  disabled: boolean;
  label: string;
  onChange: (icon: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cols = width >= 520 ? 8 : 6;
  const rows = Math.ceil(icons.length / cols);
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
  const endRow = Math.min(rows, Math.ceil((scrollTop + VIEW_HEIGHT) / ROW_HEIGHT) + 3);
  const visible = icons.slice(startRow * cols, endRow * cols);

  return (
    <div
      ref={scrollerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className="mt-2 max-h-80 overflow-y-auto rounded-lg bg-paper p-1 ring-1 ring-line"
      role="group"
      aria-label={label}
    >
      <div style={{ height: rows * ROW_HEIGHT }}>
        <div
          className="grid"
          style={{
            transform: `translateY(${startRow * ROW_HEIGHT}px)`,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridAutoRows: `${ROW_HEIGHT}px`,
          }}
        >
          {visible.map((item) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={value === item.name}
              aria-label={item.icon.iconName}
              title={item.name}
              disabled={disabled}
              onClick={() => onChange(item.name)}
              className={`grid h-9 place-items-center self-center rounded-md disabled:cursor-not-allowed ${value === item.name ? "bg-navy text-white" : "text-muted hover:bg-ice hover:text-ink"}`}
            >
              <FontAwesomeIcon icon={item.icon} className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconSpinner({ className = "" }: { className?: string }) {
  return <span className={`size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-train ${className}`} aria-hidden="true" />;
}

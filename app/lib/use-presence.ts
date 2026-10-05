"use client";

import { useEffect, useState, type RefObject } from "react";

export function usePresence(open: boolean, durationMs = 200) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [tracked, setTracked] = useState(open);

  if (open !== tracked) {
    setTracked(open);
    if (open) setMounted(true);
    setShown(false);
  }

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => setMounted(false), durationMs);
      return () => window.clearTimeout(timer);
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [durationMs, open]);

  return { mounted, shown };
}

export function useNarrow() {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 599px)");
    function sync() {
      setNarrow(query.matches);
    }
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return narrow;
}

export function useHeaderBottom(active: boolean, anchor: RefObject<HTMLElement | null>, fallback = 56) {
  const [top, setTop] = useState(fallback);

  useEffect(() => {
    if (!active) return;
    const header = anchor.current?.closest("header");
    if (!header) return;
    function place() {
      setTop(header?.getBoundingClientRect().bottom ?? fallback);
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, anchor, fallback]);

  return top;
}

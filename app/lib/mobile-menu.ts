"use client";

import { useEffect, useRef } from "react";

export type MobileMenuId = "sidebar" | "admin" | "user" | "language" | "team" | "more";

let active: MobileMenuId | null = null;
const listeners = new Set<(id: MobileMenuId | null) => void>();

function emit() {
  for (const listener of listeners) listener(active);
}

function onPhone() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 599px)").matches;
}

export function claimMobileMenu(id: MobileMenuId) {
  if (!onPhone() || active === id) return;
  active = id;
  emit();
}

export function releaseMobileMenu(id: MobileMenuId) {
  if (active !== id) return;
  active = null;
  emit();
}

export function useExclusiveMobileMenu(id: MobileMenuId, open: boolean, close: () => void) {
  const closeRef = useRef(close);

  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    return subscribe((current) => {
      if (current !== id) closeRef.current();
    });
  }, [id]);

  useEffect(() => {
    if (open) claimMobileMenu(id);
    else releaseMobileMenu(id);
  }, [id, open]);
}

function subscribe(listener: (id: MobileMenuId | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

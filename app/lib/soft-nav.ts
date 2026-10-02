"use client";

type NextHistoryState = {
  __NA?: boolean;
  _N?: boolean;
};

function nextState(): NextHistoryState {
  const current = window.history.state as NextHistoryState | null;
  return current && typeof current === "object" ? { ...current, __NA: true } : { __NA: true };
}

export function softPush(href: string) {
  window.history.pushState(nextState(), "", href);
}

export function softReplace(href: string) {
  window.history.replaceState(nextState(), "", href);
}

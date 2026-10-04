"use client";

// Next.js treats a history entry that still carries the previous route tree as
// already loaded. Copying that tree makes the next address restore the previous
// page, including after a reload. A soft entry only marks the URL. This screen
// keeps its own path and fetches a view when its data is not here yet.
function softHistoryState() {
  return { __NA: true as const };
}

export function softPush(href: string) {
  window.history.pushState(softHistoryState(), "", href);
}

export function softReplace(href: string) {
  window.history.replaceState(softHistoryState(), "", href);
}

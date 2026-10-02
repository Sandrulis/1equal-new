export const HISTORY_WINDOW_DAYS = 400;

export const RSVP_SPLIT_CELLS = 1500;

export const RSVP_HOT_DAYS = 45;

export function historySince(now = new Date()): string {
  const since = new Date(now);
  since.setDate(since.getDate() - HISTORY_WINDOW_DAYS);
  return since.toISOString().slice(0, 10);
}

export function rsvpHotSince(now = new Date()): string {
  const since = new Date(now);
  since.setDate(since.getDate() - RSVP_HOT_DAYS);
  return since.toISOString().slice(0, 10);
}

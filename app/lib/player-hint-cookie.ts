export const PLAYER_HINT_COOKIE = "1equal-player-hint";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function dismissedCodes(): Set<string> {
  if (typeof document === "undefined") return new Set();
  const prefix = `${PLAYER_HINT_COOKIE}=`;
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!raw || raw === "1") return raw === "1" ? new Set(["*"]) : new Set();
  return new Set(decodeURIComponent(raw).split(",").filter(Boolean));
}

export function readPlayerHintDismissed(teamCode: string): boolean {
  const codes = dismissedCodes();
  return codes.has("*") || codes.has(teamCode);
}

export function writePlayerHintDismissed(teamCode: string) {
  const codes = dismissedCodes();
  codes.delete("*");
  codes.add(teamCode);
  const value = [...codes].slice(-30).join(",");
  document.cookie = [`${PLAYER_HINT_COOKIE}=${encodeURIComponent(value)}`, `Max-Age=${MAX_AGE_SECONDS}`, "Path=/", "SameSite=Lax"].join("; ");
}

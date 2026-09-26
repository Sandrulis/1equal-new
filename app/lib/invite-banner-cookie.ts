export const INVITE_BANNER_COOKIE = "1equal-invite-banner";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function dismissedCodes(): Set<string> {
  if (typeof document === "undefined") return new Set();
  const prefix = `${INVITE_BANNER_COOKIE}=`;
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!raw) return new Set();
  return new Set(decodeURIComponent(raw).split(",").filter(Boolean));
}

export function readInviteBannerDismissed(teamCode: string): boolean {
  return dismissedCodes().has(teamCode);
}

export function writeInviteBannerDismissed(teamCode: string) {
  const codes = dismissedCodes();
  codes.add(teamCode);
  writeCodes(codes);
}

export function clearInviteBannerDismissed(teamCode: string) {
  const codes = dismissedCodes();
  codes.delete(teamCode);
  writeCodes(codes);
}

function writeCodes(codes: Set<string>) {
  const value = [...codes].slice(-30).join(",");
  document.cookie = [`${INVITE_BANNER_COOKIE}=${encodeURIComponent(value)}`, `Max-Age=${MAX_AGE_SECONDS}`, "Path=/", "SameSite=Lax"].join("; ");
}

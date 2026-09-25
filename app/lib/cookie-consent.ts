export const CONSENT_COOKIE = "1equal-consent";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type OptionalCookieCategory = "preferences" | "analytics" | "marketing";

export type CookieConsentSelection = Record<OptionalCookieCategory, boolean>;

export type CookieConsentState = CookieConsentSelection & {
  updatedAt: string;
};

export const OPTIONAL_COOKIE_CATEGORIES: OptionalCookieCategory[] = ["preferences", "analytics", "marketing"];

export const DENIED_COOKIE_CONSENT: CookieConsentSelection = {
  preferences: false,
  analytics: false,
  marketing: false,
};

export const GRANTED_COOKIE_CONSENT: CookieConsentSelection = {
  preferences: true,
  analytics: true,
  marketing: true,
};

function isSelection(value: unknown): value is CookieConsentSelection {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return OPTIONAL_COOKIE_CATEGORIES.every((category) => typeof record[category] === "boolean");
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(CONSENT_COOKIE)}=`;
  const match = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(match.slice(prefix.length)));
    if (!isSelection(parsed)) return null;
    const record = parsed as CookieConsentSelection & { updatedAt?: unknown };
    const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
    return { preferences: record.preferences, analytics: record.analytics, marketing: record.marketing, updatedAt };
  } catch {
    return null;
  }
}

export function writeCookieConsent(selection: CookieConsentSelection): CookieConsentState {
  const state: CookieConsentState = { ...selection, updatedAt: new Date().toISOString() };
  document.cookie = [
    `${encodeURIComponent(CONSENT_COOKIE)}=${encodeURIComponent(JSON.stringify(state))}`,
    `Max-Age=${MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
  ].join("; ");
  return state;
}

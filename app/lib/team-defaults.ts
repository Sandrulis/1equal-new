export const CURRENCIES = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "CHF", symbol: "CHF" },
  { code: "PLN", symbol: "zł" },
  { code: "SEK", symbol: "kr" },
  { code: "NOK", symbol: "kr" },
  { code: "DKK", symbol: "kr" },
  { code: "CZK", symbol: "Kč" },
  { code: "HUF", symbol: "Ft" },
  { code: "RON", symbol: "lei" },
  { code: "BGN", symbol: "лв" },
  { code: "TRY", symbol: "₺" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "JPY", symbol: "¥" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";
export const DEFAULT_TRAINING_VOTING_HOURS = 24;
export const DEFAULT_GAME_VOTING_HOURS = 72;

const CURRENCY_CODES = new Set<string>(CURRENCIES.map((item) => item.code));

export function isCurrency(value: string): value is CurrencyCode {
  return CURRENCY_CODES.has(value);
}

export function normalizeCurrency(value: unknown): CurrencyCode {
  return typeof value === "string" && isCurrency(value) ? value : DEFAULT_CURRENCY;
}

export function currencySymbol(value: unknown): string {
  const code = normalizeCurrency(value);
  return CURRENCIES.find((item) => item.code === code)?.symbol ?? "€";
}

export function votingHours(value: unknown): number | null {
  const hours = Math.round(Number(value));
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) return null;
  return hours;
}

export type CreateTeamInput = {
  name: string;
  sourceUrl: string | null;
  logoUrl: string | null;
  currency: string | null;
  trainingVotingHours: number;
  gameVotingHours: number;
};

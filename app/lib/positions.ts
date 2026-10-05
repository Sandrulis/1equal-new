import type { MessageKey } from "@/app/lib/messages";

export const PLAYING_POSITIONS = [
  { code: "LW", label: "position.lw" },
  { code: "C", label: "position.c" },
  { code: "RW", label: "position.rw" },
  { code: "D", label: "position.d" },
  { code: "G", label: "position.g" },
] as const;

export type PositionCode = (typeof PLAYING_POSITIONS)[number]["code"];

const ALIASES: Record<string, PositionCode> = {
  LW: "LW",
  LEFT: "LW",
  LEFTWING: "LW",
  KREISAIS: "LW",
  C: "C",
  CENTER: "C",
  CENTRE: "C",
  CENTRS: "C",
  RW: "RW",
  RIGHT: "RW",
  RIGHTWING: "RW",
  LABAIS: "RW",
  D: "D",
  LD: "D",
  RD: "D",
  DEFENSE: "D",
  DEFENCE: "D",
  DEFENDER: "D",
  AIZSARGS: "D",
  G: "G",
  GOALIE: "G",
  GOALKEEPER: "G",
  VARTSARGS: "G",
};

const RETIRED_POSITION = /^(TR|TRENERIS|COACH|TRAINER)$/;

function foldPosition(value: string): string {
  return value
    .trim()
    .toLocaleUpperCase("lv")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z]/g, "");
}

export function normalizePositionCode(value: string | null | undefined): PositionCode | "" {
  const folded = foldPosition(value ?? "");
  if (!folded || RETIRED_POSITION.test(folded)) return "";
  return ALIASES[folded] ?? "";
}

export function displayPosition(value: string | null | undefined): string {
  const code = normalizePositionCode(value);
  if (code) return code;
  const raw = (value ?? "").trim();
  if (!raw || RETIRED_POSITION.test(foldPosition(raw))) return "";
  return raw;
}

export type PositionCatalogItem = {
  code: string;
  names?: Record<string, string>;
};

export const HOCKEY_POSITION_CATALOG: PositionCatalogItem[] = PLAYING_POSITIONS.map((item) => ({ code: item.code }));

export function cleanPositionCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,8}$/.test(code)) return "";
  return code;
}

export function catalogForSport(sportId: string | null | undefined, sports: { id: string; positions?: PositionCatalogItem[] }[]): PositionCatalogItem[] {
  if (!sportId) return HOCKEY_POSITION_CATALOG;
  return sports.find((item) => item.id === sportId)?.positions ?? [];
}

export function resolvePositionCode(value: string | null | undefined, catalog: PositionCatalogItem[]): string {
  const direct = cleanPositionCode(value ?? "");
  if (direct && catalog.some((item) => item.code === direct)) return direct;
  const alias = ALIASES[foldPosition(value ?? "")];
  if (alias && catalog.some((item) => item.code === alias)) return alias;
  return "";
}

export function formatPosition(
  code: string,
  catalog: PositionCatalogItem[],
  lang: string,
  fallbackLang: string,
  t: (key: MessageKey) => string,
): { code: string; name: string; label: string } {
  const resolved = resolvePositionCode(code, catalog) || displayPosition(code);
  if (!resolved) return { code: "", name: "", label: "" };
  const known = catalog.find((item) => item.code === resolved);
  if (!known) {
    if (catalog.length === 0) {
      return { code: positionCode(resolved), name: positionName(resolved, t), label: positionLabel(resolved, t) };
    }
    return { code: resolved, name: resolved, label: resolved };
  }
  const named = known.names?.[lang]?.trim() || known.names?.[fallbackLang]?.trim() || Object.values(known.names ?? {}).map((value) => value.trim()).find(Boolean) || "";
  const fallbackName = positionName(resolved, t);
  const name = named || (fallbackName !== resolved ? fallbackName : "");
  return { code: resolved, name: name || resolved, label: name ? `${resolved} ${name}` : resolved };
}

export function memberUsesCode(position: string, extras: string, code: string): boolean {
  const target = cleanPositionCode(code);
  if (!target) return false;
  if (cleanPositionCode(position) === target) return true;
  return extras.split(",").some((part) => cleanPositionCode(part) === target);
}

export function positionLabel(code: string, t: (key: MessageKey) => string): string {
  const known = PLAYING_POSITIONS.find((item) => item.code === normalizePositionCode(code));
  if (!known) return displayPosition(code);
  return `${known.code} ${t(known.label)}`;
}

export function positionCode(code: string): string {
  return normalizePositionCode(code) || displayPosition(code);
}

export function positionName(code: string, t: (key: MessageKey) => string): string {
  const known = PLAYING_POSITIONS.find((item) => item.code === normalizePositionCode(code));
  if (!known) return displayPosition(code);
  return t(known.label);
}

function storedCode(value: string): string {
  return normalizePositionCode(value) || cleanPositionCode(value);
}

export function parseExtraPositions(value: string | string[] | null | undefined, primary: string, catalog?: PositionCatalogItem[]): string[] {
  const primaryCode = catalog ? resolvePositionCode(primary, catalog) : storedCode(primary);
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const found: string[] = [];
  for (const part of raw.split(",")) {
    const code = catalog ? resolvePositionCode(part, catalog) : storedCode(part);
    if (code && code !== primaryCode && !found.includes(code)) found.push(code);
  }
  if (!catalog) return found;
  return catalog.map((item) => item.code).filter((code) => found.includes(code));
}

export function serializeExtraPositions(values: string[], primary: string, catalog?: PositionCatalogItem[]): string {
  return parseExtraPositions(values, primary, catalog).join(",");
}

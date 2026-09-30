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

export function positionLabel(code: string, t: (key: MessageKey) => string): string {
  const known = PLAYING_POSITIONS.find((item) => item.code === normalizePositionCode(code));
  if (!known) return displayPosition(code);
  return `${known.code} ${t(known.label)}`;
}

export function parseExtraPositions(value: string | string[] | null | undefined, primary: string): PositionCode[] {
  const primaryCode = normalizePositionCode(primary);
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const found = new Set<PositionCode>();
  for (const part of raw.split(/[^A-Za-zĀ-ž]+/)) {
    const code = normalizePositionCode(part);
    if (code && code !== primaryCode) found.add(code);
  }
  return PLAYING_POSITIONS.map((item) => item.code).filter((code) => found.has(code));
}

export function serializeExtraPositions(values: string[], primary: string): string {
  return parseExtraPositions(values, primary).join(",");
}

export const DEFAULT_SPORT_ICON = "hockey-puck";

const LEGACY_SPORT_ICONS: Record<string, string> = {
  hockey: "hockey-puck",
  ball: "futbol",
  basket: "basketball",
  racket: "table-tennis-paddle-ball",
  swim: "person-swimming",
  run: "person-running",
};

export type SportPosition = {
  id: string;
  code: string;
  sortOrder: number;
  names: Record<string, string>;
};

export type Sport = {
  id: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  names: Record<string, string>;
  moduleKeys: string[];
  positions: SportPosition[];
};

export function sportIconName(value: string): string | null {
  const raw = value.trim().toLowerCase();
  const source = LEGACY_SPORT_ICONS[raw] ?? raw;
  const match = source.match(/^(?:(fas|far|fab):)?([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (!match) return null;
  const prefix = match[1] ?? "fas";
  const name = match[2];
  const stored = prefix === "fas" ? name : `${prefix}:${name}`;
  if (stored.length > 80) return null;
  return stored;
}

export function displaySportIcon(value: string): string {
  return sportIconName(value) ?? DEFAULT_SPORT_ICON;
}

export function sportLabel(sport: Sport, lang: string, fallbackLang: string): string {
  const named = sport.names[lang]?.trim() || sport.names[fallbackLang]?.trim();
  if (named) return named;
  const any = Object.values(sport.names).find((value) => value.trim());
  return any?.trim() || sport.id;
}

export function chosenSportId(sports: Sport[], selected: string): string | null {
  const active = sports.filter((sport) => sport.isActive);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0].id;
  if (active.some((sport) => sport.id === selected)) return selected;
  return active[0].id;
}

export const SPORT_ICONS = ["hockey", "ball", "basket", "racket", "swim", "run"] as const;

export type SportIcon = (typeof SPORT_ICONS)[number];

export type Sport = {
  id: string;
  icon: SportIcon;
  isActive: boolean;
  sortOrder: number;
  names: Record<string, string>;
  moduleKeys: string[];
};

export function isSportIcon(value: string): value is SportIcon {
  return (SPORT_ICONS as readonly string[]).includes(value);
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

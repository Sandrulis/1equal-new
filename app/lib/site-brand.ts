export const DEFAULT_SITE_NAME = "1equal";

export function siteTitleFor(name: string): string {
  return `${name} · Komandas sezona vienā vietā`;
}

export function applyBrandName(text: string, name: string): string {
  if (!name || name === DEFAULT_SITE_NAME) return text;
  return text.replace(/1equal(?!-)/g, name);
}

export function brandInitial(name: string): string {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : "1";
}

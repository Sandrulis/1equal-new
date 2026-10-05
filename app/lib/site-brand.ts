export const DEFAULT_SITE_NAME = "1equal";

export function siteTitleFor(name: string): string {
  return `${name} – Sporta komandas vadības sistēma`;
}

/** Visible product name. The stored default "1equal" is shown as "1Equal". Cookie names stay unchanged. */
export function displayBrandName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === DEFAULT_SITE_NAME) return "1Equal";
  return trimmed;
}

export function applyBrandName(text: string, name: string): string {
  const shown = displayBrandName(name);
  return text.replace(/1equal(?![-.])/gi, shown);
}

export function brandInitial(name: string): string {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : "1";
}

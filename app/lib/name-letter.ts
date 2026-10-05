export const NAME_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type NameLetter = (typeof NAME_LETTERS)[number] | "#";

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function nameLetter(value: string): NameLetter | null {
  const first = value.trim().charAt(0);
  if (!first) return null;
  if (first >= "0" && first <= "9") return "#";
  const letter = stripDiacritics(first).toLocaleUpperCase("en-US");
  if (letter >= "A" && letter <= "Z") return letter as NameLetter;
  return null;
}

export function formatJersey(number: number | null | undefined): string | null {
  if (number == null || !Number.isInteger(number) || number < 0 || number > 99) return null;
  return `#${number}`;
}

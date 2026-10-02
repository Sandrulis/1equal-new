export function countryName(code: string, lang: string): string {
  const value = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) return "";
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(value) ?? value;
  } catch {
    return value;
  }
}

export function originLabel(ip: string, countryCode: string, lang: string): string {
  const place = countryName(countryCode, lang);
  const address = ip.trim();
  if (place && address) return `${place} (${address})`;
  return place || address;
}

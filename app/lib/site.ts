export const siteName = "1equal";

export const siteTitle = "1equal · Komandas sezona vienā vietā";

export const siteDescription =
  "Kalendārs, sastāvs, dalība un laukumu maksa amatieru hokeja komandai. Spēles, treniņi un maksājumi vienā skaidrā panelī.";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return "http://localhost:3130";
}

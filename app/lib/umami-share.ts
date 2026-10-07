export type UmamiShareLink = {
  slug: string;
  gateway: string;
  url: string;
};

const SHARE_PATH = /^\/analytics\/eu\/share\/([A-Za-z0-9]{6,80})$/;

export function parseUmamiShareUrl(value: string): UmamiShareLink | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "cloud.umami.is") return null;
  const match = url.pathname.match(SHARE_PATH);
  if (!match) return null;
  const slug = match[1] ?? "";
  return {
    slug,
    gateway: "https://gateway-eu.umami.is/api",
    url: `https://cloud.umami.is/analytics/eu/share/${slug}`,
  };
}

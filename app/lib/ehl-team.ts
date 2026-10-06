const HOSTS = new Set(["ehl.entuziasti.com", "www.ehl.entuziasti.com", "entuziasti.lv", "www.entuziasti.lv"]);
const TEAM_PATH = /^\/komandas\/[a-z0-9-]+\/\d+\/?$/i;

export function parseEhlTeamUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host) || !TEAM_PATH.test(url.pathname)) return null;
  url.protocol = "https:";
  url.hostname = host.startsWith("www.") ? host.slice(4) : host;
  url.hash = "";
  url.search = "";
  return url;
}

export function isEhlHost(hostname: string): boolean {
  return HOSTS.has(hostname.toLowerCase());
}

export function readEhlTeamTitle(html: string): string | null {
  const match = html.match(/<h1[^>]*class="[^"]*\bteam-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return null;
  const text = decodeHtml(match[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  return text || null;
}

export function readEhlTeamLogo(html: string, pageUrl: string): string | null {
  const image = html.match(/<img[^>]*class="[^"]*\bmain-logo\b[^"]*"[^>]*>/i);
  return imageUrl(image?.[0] ?? "", pageUrl);
}

export function readEhlTeamKits(html: string, pageUrl: string): { homeKitUrl: string | null; awayKitUrl: string | null } {
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  return {
    homeKitUrl: kitUrl(images, pageUrl, /forma mājās/i, /\/home_/i),
    awayKitUrl: kitUrl(images, pageUrl, /forma izbraukumā/i, /\/away_/i),
  };
}

export function teamNamesMatch(entered: string, remote: string): boolean {
  const left = foldTeamName(entered);
  const right = foldTeamName(remote);
  return left.length > 0 && left === right;
}

function foldTeamName(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/u, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("lv");
}

function imageUrl(tag: string, pageUrl: string): string | null {
  const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
  if (!src) return null;
  try {
    return new URL(decodeHtml(src), pageUrl).toString();
  } catch {
    return null;
  }
}

function kitUrl(images: string[], pageUrl: string, alt: RegExp, srcHint: RegExp): string | null {
  const tag = images.find((item) => {
    const label = decodeHtml(item.match(/\balt="([^"]*)"/i)?.[1] ?? "");
    const src = item.match(/\bsrc="([^"]+)"/i)?.[1] ?? "";
    return alt.test(label) || srcHint.test(src);
  });
  return tag ? imageUrl(tag, pageUrl) : null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

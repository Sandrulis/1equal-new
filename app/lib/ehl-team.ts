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
  const src = image?.[0].match(/\bsrc="([^"]+)"/i)?.[1];
  if (!src) return null;
  try {
    return new URL(decodeHtml(src), pageUrl).toString();
  } catch {
    return null;
  }
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

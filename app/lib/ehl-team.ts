import { parseEhlPlayerUrl } from "@/app/lib/ehl-player";

const HOSTS = new Set(["ehl.entuziasti.com", "www.ehl.entuziasti.com", "entuziasti.lv", "www.entuziasti.lv"]);
const TEAM_PATH = /^\/komandas\/[a-z0-9-]+\/\d+(?:\/\d+)?\/?$/i;

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

export type EhlRosterPlayer = {
  name: string;
  number: number | null;
  url: string;
};

export function readEhlTeamPlayers(html: string, pageUrl: string): EhlRosterPlayer[] {
  const rows = html.match(/<tr\b[^>]*\bplayer-row\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const found = new Map<string, EhlRosterPlayer>();
  for (const row of rows) {
    const href = row.match(/href="(\/personas\/[a-z0-9-]+\/\d+\/\d+)"/i)?.[1];
    if (!href) continue;
    let absolute = "";
    try {
      absolute = new URL(href, pageUrl).toString();
    } catch {
      continue;
    }
    const url = parseEhlPlayerUrl(absolute)?.toString();
    if (!url || found.has(url)) continue;
    const name = textOf(row.match(/class="[^"]*\bname\b[^"]*"[^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "");
    const number = rosterNumber(textOf(row.match(/<td>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? ""));
    if (!name) continue;
    found.set(url, { name, number, url });
  }
  return [...found.values()];
}

export function matchEhlRoster(
  members: { id: string; name: string; number: number | null; linked: boolean }[],
  remote: EhlRosterPlayer[],
): { memberId: string; url: string }[] {
  const pairs: { memberId: string; url: string; score: number }[] = [];
  for (const member of members) {
    if (member.linked) continue;
    const memberName = personMatchKey(member.name);
    for (const player of remote) {
      const nameHit = memberName.length > 0 && memberName === personMatchKey(player.name);
      const numberHit = member.number != null && player.number != null && member.number === player.number;
      if (!nameHit && !numberHit) continue;
      pairs.push({ memberId: member.id, url: player.url, score: (nameHit ? 2 : 0) + (numberHit ? 1 : 0) });
    }
  }
  pairs.sort((left, right) => right.score - left.score || left.memberId.localeCompare(right.memberId));
  const usedMembers = new Set<string>();
  const skippedMembers = new Set<string>();
  const usedUrls = new Set<string>();
  const chosen: { memberId: string; url: string }[] = [];
  for (const pair of pairs) {
    if (usedMembers.has(pair.memberId) || skippedMembers.has(pair.memberId) || usedUrls.has(pair.url)) continue;
    const memberTies = pairs.filter((item) => item.memberId === pair.memberId && item.score === pair.score && !usedUrls.has(item.url));
    if (memberTies.length > 1) {
      skippedMembers.add(pair.memberId);
      continue;
    }
    const remoteTies = pairs.filter((item) => item.url === pair.url && item.score === pair.score && !usedMembers.has(item.memberId) && !skippedMembers.has(item.memberId));
    if (remoteTies.length > 1) continue;
    chosen.push({ memberId: pair.memberId, url: pair.url });
    usedMembers.add(pair.memberId);
    usedUrls.add(pair.url);
  }
  return chosen;
}

function personMatchKey(value: string): string {
  const parts = foldPersonName(value).split(" ").filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return [parts[0], parts[parts.length - 1]].sort().join(" ");
}

function foldPersonName(value: string): string {
  const folds: Record<string, string> = { ā: "a", č: "c", ē: "e", ģ: "g", ī: "i", ķ: "k", ļ: "l", ņ: "n", š: "s", ū: "u", ž: "z", ō: "o", ŗ: "r" };
  let folded = "";
  for (const char of value.toLocaleLowerCase("lv")) folded += folds[char] ?? char;
  return folded.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function rosterNumber(value: string): number | null {
  if (!/^\d{1,3}$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function textOf(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
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

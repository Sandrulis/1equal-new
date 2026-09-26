const HOSTS = new Set(["ehl.entuziasti.com", "www.ehl.entuziasti.com", "entuziasti.lv", "www.entuziasti.lv"]);
const PLAYER_PATH = /^\/personas\/[a-z0-9-]+\/\d+\/\d+\/?$/i;

export type EhlStatRow = {
  label: string;
  stats: Record<string, string>;
};

export type EhlGame = {
  match: string;
  date: string;
  score: string | null;
  stats: Record<string, string>;
};

export type EhlStatBlock = {
  label: string;
  columns: string[];
  games: EhlGame[];
};

export type EhlPlayerProfile = {
  sourceUrl: string;
  fetchedAt: string;
  name: string;
  team: string | null;
  number: string | null;
  position: string | null;
  height: string | null;
  weight: string | null;
  stick: string | null;
  birthDate: string | null;
  country: string | null;
  photoUrl: string | null;
  season: {
    label: string;
    columns: string[];
    results: Record<string, string>;
    ranking: Record<string, string>;
  } | null;
  regularSeason: EhlStatBlock;
  playoff: EhlStatBlock;
  career: EhlStatRow[];
};

const FIELD_KEY = {
  "spēlētāja numurs": "number",
  pozīcija: "position",
  augums: "height",
  svars: "weight",
  "nūjas satvēriens": "stick",
  "dzimšanas dati": "birthDate",
  valsts: "country",
} as const;

export function parseEhlPlayerUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host) || !PLAYER_PATH.test(url.pathname)) return null;
  url.protocol = "https:";
  url.hostname = host.startsWith("www.") ? host.slice(4) : host;
  url.hash = "";
  url.search = "";
  return url;
}

export function parseEhlPlayerPage(html: string, sourceUrl: string, fetchedAt = new Date().toISOString()): EhlPlayerProfile | null {
  const name = textOf(html.match(/<h1[^>]*class="[^"]*\bplayer-name\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  if (!name) return null;

  const team = textOf(html.match(/<h2[^>]*class="[^"]*\bcolor-grey\b[^"]*"[^>]*>([\s\S]*?)<\/h2>[\s\S]{0,500}?<h1[^>]*class="[^"]*\bplayer-name\b/i)?.[1] ?? "") || null;
  const bio = tableRows(html.match(/<table class="player-stats">([\s\S]*?)<\/table>/i)?.[1] ?? "");
  const fields = Object.fromEntries(bio.map((row) => [row[0] ?? "", row[1] ?? ""]).filter((row) => row[0]));
  const picked = pickFields(fields);

  const seasonTable = html.match(/<table class="player-stats stats-season[^"]*">([\s\S]*?)<\/table>/i)?.[1] ?? "";
  const season = readSeason(tableRows(seasonTable));
  const regularSeason = readBlock(html, "Regulārā sezona");
  const playoff = readBlock(html, "Play off");
  const career = readCareer(html);

  return {
    sourceUrl,
    fetchedAt,
    name,
    team,
    ...picked,
    photoUrl: readPlayerPhoto(html, sourceUrl),
    season,
    regularSeason,
    playoff,
    career,
  };
}

export function readStoredEhlPlayer(value: unknown): EhlPlayerProfile | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<EhlPlayerProfile>;
  if (typeof row.name !== "string" || typeof row.sourceUrl !== "string") return null;
  return row as EhlPlayerProfile;
}

export function readStoredEhlPlayers(value: unknown): Record<string, EhlPlayerProfile> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  if (typeof row.sourceUrl === "string") return {};
  const players: Record<string, EhlPlayerProfile> = {};
  for (const [code, item] of Object.entries(row)) {
    if (!/^[A-Z0-9]{4,16}$/.test(code)) continue;
    const player = readStoredEhlPlayer(item);
    if (player) players[code] = player;
  }
  return players;
}

function readPlayerPhoto(html: string, pageUrl: string): string | null {
  const tag = html.match(/<img\b[^>]*\bplayer-img\b[^>]*>/i)?.[0] ?? "";
  const src = tag.match(/\bsrc\s*=\s*"([^"]+)"/i)?.[1] ?? "";
  if (!src) return null;
  try {
    return new URL(src, pageUrl).toString();
  } catch {
    return null;
  }
}

function pickFields(fields: Record<string, string>) {
  const found: Record<(typeof FIELD_KEY)[keyof typeof FIELD_KEY], string | null> = {
    number: null,
    position: null,
    height: null,
    weight: null,
    stick: null,
    birthDate: null,
    country: null,
  };
  for (const [label, value] of Object.entries(fields)) {
    const key = FIELD_KEY[label.toLocaleLowerCase("lv") as keyof typeof FIELD_KEY];
    if (key) found[key] = value || null;
  }
  return found;
}

function readSeason(rows: string[][]): EhlPlayerProfile["season"] {
  const header = rows[0];
  if (!header || header.length < 2) return null;
  const columns = header.slice(1);
  const results = zipStats(columns, rows.find((row) => row[0]?.startsWith("Sezonas rezultāti"))?.slice(1) ?? []);
  const ranking = zipStats(columns, rows.find((row) => row[0]?.startsWith("Līgas reitings"))?.slice(1) ?? []);
  return { label: header[0] ?? "", columns, results, ranking };
}

function readBlock(html: string, title: string): EhlStatBlock {
  const marker = new RegExp(`<h2[^>]*class="[^"]*\\bplayer-title\\b[^"]*"[^>]*>\\s*${title}\\s*</h2>([\\s\\S]*?)<table class="player-stats stats-large">([\\s\\S]*?)</table>`, "i");
  const match = html.match(marker);
  const label = textOf(match?.[1]?.match(/<span[^>]*class="[^"]*\bitem-year\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "") || title;
  const parsed = gameRows(match?.[2] ?? "");
  return { label, columns: parsed.columns, games: parsed.games };
}

function readCareer(html: string): EhlStatRow[] {
  const at = html.indexOf("EHL karjera");
  if (at < 0) return [];
  const start = html.lastIndexOf("<table", at);
  const end = html.indexOf("</table>", at);
  const rows = tableRows(start >= 0 && end > start ? html.slice(start, end) : "");
  const header = rows.find((row) => row[0] === "EHL karjera");
  if (!header) return [];
  const columns = header.slice(1);
  return rows
    .filter((row) => row !== header && row[0])
    .map((row) => ({ label: row[0] ?? "", stats: zipStats(columns, row.slice(1)) }));
}

function zipStats(columns: string[], values: string[]): Record<string, string> {
  const stats: Record<string, string> = {};
  columns.forEach((column, index) => {
    if (column) stats[column] = values[index] ?? "";
  });
  return stats;
}

function gameRows(tableHtml: string): { columns: string[]; games: EhlGame[] } {
  const rows = [...tableHtml.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)].filter((row) => !/\bspacer\b/.test(row[1]));
  const headerCells = rows[0] ? [...rows[0][2].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => textOf(cell[1])).filter(Boolean) : [];
  const games: EhlGame[] = [];
  for (const row of rows.slice(1)) {
    const cells = [...row[2].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    const values = cells.map((cell) => textOf(cell[1]));
    const score = cells[0]?.[1].match(/\btitle="([^"]*)"/i)?.[1] ?? null;
    const game: EhlGame = {
      match: values[0] ?? "",
      date: values[1] ?? "",
      score: score ? decodeHtml(score) : null,
      stats: zipStats(headerCells, values.slice(2)),
    };
    if (game.match) games.push(game);
  }
  return { columns: headerCells, games };
}

function tableRows(tableHtml: string): string[][] {
  const rows: string[][] = [];
  for (const row of tableHtml.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    if (/\bspacer\b/.test(row[1])) continue;
    const values = [...row[2].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => textOf(cell[1]));
    if (values.some(Boolean)) rows.push(values);
  }
  return rows;
}

function textOf(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
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

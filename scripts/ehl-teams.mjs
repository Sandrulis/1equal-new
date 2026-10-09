/**
 * Nolasa EHL komandu sarakstu un katras komandas lapu.
 * Izvada progresu un saglabā tabulu data/ehl-teams.csv.
 *
 *   npm run ehl:teams
 *   npm run ehl:teams -- --fresh
 *   npm run ehl:teams -- --limit 5
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INDEX_URL = "https://ehl.entuziasti.com/komandas";
const ORIGIN = "https://ehl.entuziasti.com";
const OUT_DIR = path.join(process.cwd(), "data");
const JSON_PATH = path.join(OUT_DIR, "ehl-teams.json");
const CSV_PATH = path.join(OUT_DIR, "ehl-teams.csv");
const DELAY_MS = 250;

const args = new Set(process.argv.slice(2));
const fresh = args.has("--fresh");
const limit = readLimit(process.argv);

function readLimit(argv) {
  const eq = argv.find((arg) => arg.startsWith("--limit="));
  if (eq) return Number(eq.slice("--limit=".length));
  const index = argv.indexOf("--limit");
  if (index >= 0) return Number(argv[index + 1]);
  return 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function textOf(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function readTitle(html) {
  const match = html.match(/<h1[^>]*class="[^"]*\bteam-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? textOf(match[1]) : "";
}

function readManager(html) {
  const match = html.match(/<td>\s*Menedžeris\s*<\/td>\s*<td>([\s\S]*?)<\/td>/i);
  return match ? textOf(match[1]) : "";
}

function collectTeams(html) {
  const found = new Map();
  const re = /href="(\/komandas\/([a-z0-9-]+)\/(\d+))(?:\/\d+)?"/gi;
  for (const match of html.matchAll(re)) {
    const id = match[3];
    if (found.has(id)) continue;
    found.set(id, {
      id,
      slug: match[2],
      url: `${ORIGIN}${match[1]}`,
    });
  }
  return [...found.values()];
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: {
      accept: "text/html",
      "user-agent": "1equal-ehl-teams/1.0",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const host = new URL(response.url).hostname;
  if (host !== "ehl.entuziasti.com" && host !== "www.ehl.entuziasti.com") {
    throw new Error(`negaidīts hosts ${host}`);
  }
  return response.text();
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(teams) {
  const header = ["name", "manager", "url"];
  const rows = teams.map((team) => [team.name, team.manager, team.url].map(csvCell).join(","));
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}

async function loadSaved() {
  if (fresh) return [];
  try {
    const raw = await readFile(JSON_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.teams) ? parsed.teams : [];
  } catch {
    return [];
  }
}

function snapshot(current) {
  const merged = new Map(saved.map((team) => [team.url, team]));
  for (const team of current) merged.set(team.url, team);
  return [...merged.values()];
}

async function save(current) {
  const teams = snapshot(current);
  await mkdir(OUT_DIR, { recursive: true });
  const payload = {
    source: INDEX_URL,
    updatedAt: new Date().toISOString(),
    teams,
  };
  await writeFile(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(CSV_PATH, toCsv(teams));
}

function log(line) {
  process.stdout.write(`${line}\n`);
}

const indexHtml = await fetchHtml(INDEX_URL);
const listed = collectTeams(indexHtml);
const queue = limit > 0 ? listed.slice(0, limit) : listed;
const saved = await loadSaved();
const byUrl = new Map(saved.filter((team) => team.ok && team.name).map((team) => [team.url, team]));

log(`EHL komandas sarakstā: ${listed.length}${limit > 0 ? `, šoreiz ${queue.length}` : ""}`);

const teams = [];
let done = 0;
for (const team of queue) {
  done += 1;
  const cached = byUrl.get(team.url);
  if (cached) {
    teams.push(cached);
    log(`[${done}/${queue.length}] ${cached.name} - ${cached.manager || "—"} (jau saglabāts)`);
    continue;
  }

  try {
    const html = await fetchHtml(team.url);
    const name = readTitle(html) || team.slug;
    const manager = readManager(html);
    const row = {
      id: team.id,
      slug: team.slug,
      name,
      manager,
      url: team.url,
      ok: true,
    };
    teams.push(row);
    log(`[${done}/${queue.length}] ${name} - ${manager || "—"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "kļūda";
    teams.push({
      id: team.id,
      slug: team.slug,
      name: "",
      manager: "",
      url: team.url,
      ok: false,
      error: message,
    });
    log(`[${done}/${queue.length}] ${team.url} - kļūda: ${message}`);
  }

  await save(teams);
  if (done < queue.length) await sleep(DELAY_MS);
}

const withManager = teams.filter((team) => team.ok && team.manager).length;
const withoutManager = teams.filter((team) => team.ok && !team.manager).length;
const failed = teams.filter((team) => !team.ok).length;
log("");
log(`Gatavs. ${withManager} ar menedžeri, ${withoutManager} bez, ${failed} kļūdas.`);
log(`Tabula: ${path.relative(process.cwd(), CSV_PATH)}`);

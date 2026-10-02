import { config, type IconDefinition, type IconPrefix } from "@fortawesome/fontawesome-svg-core";
import { sportIconName } from "@/app/lib/sports";

config.autoAddCss = false;

const FREE_PREFIXES = new Set<IconPrefix>(["fas", "far", "fab"]);

export type FaIconHit = {
  name: string;
  icon: IconDefinition;
};

type CatalogEntry = FaIconHit & {
  terms: string;
};

let solidPromise: Promise<Map<string, CatalogEntry>> | null = null;
let catalogPromise: Promise<Map<string, CatalogEntry>> | null = null;
let sortedCatalog: CatalogEntry[] | null = null;

function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function isIconDefinition(value: unknown): value is IconDefinition {
  if (!value || typeof value !== "object") return false;
  const icon = value as IconDefinition;
  return FREE_PREFIXES.has(icon.prefix) && typeof icon.iconName === "string" && Array.isArray(icon.icon);
}

function storedIconName(icon: IconDefinition): string {
  return icon.prefix === "fas" ? icon.iconName : `${icon.prefix}:${icon.iconName}`;
}

function addPack(pack: object, map: Map<string, CatalogEntry>) {
  for (const value of Object.values(pack)) {
    if (!isIconDefinition(value)) continue;
    const name = storedIconName(value);
    if (map.has(name)) continue;
    const aliases = (value.icon[2] ?? []).filter((item): item is string => typeof item === "string");
    map.set(name, { name, terms: [value.iconName, ...aliases].join(" "), icon: value });
  }
}

function loadSolidCatalog(): Promise<Map<string, CatalogEntry>> {
  if (!solidPromise) {
    solidPromise = import("@fortawesome/free-solid-svg-icons").then((pack) => {
      const map = new Map<string, CatalogEntry>();
      addPack(pack, map);
      return map;
    });
  }
  return solidPromise;
}

export function loadFaCatalog(): Promise<Map<string, CatalogEntry>> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const solid = await loadSolidCatalog();
      await yieldToPaint();
      const regular = await import("@fortawesome/free-regular-svg-icons");
      await yieldToPaint();
      const brands = await import("@fortawesome/free-brands-svg-icons");
      const map = new Map(solid);
      addPack(regular, map);
      addPack(brands, map);
      return map;
    })();
  }
  return catalogPromise;
}

function iconFile(name: string): string {
  const pascal = name
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `fa${pascal}`;
}

const iconPromises = new Map<string, Promise<IconDefinition | null>>();

async function importOneIcon(prefix: IconPrefix, file: string): Promise<IconDefinition | null> {
  try {
    const loaded =
      prefix === "far"
        ? await import(`@fortawesome/free-regular-svg-icons/${file}.js`)
        : prefix === "fab"
          ? await import(`@fortawesome/free-brands-svg-icons/${file}.js`)
          : await import(`@fortawesome/free-solid-svg-icons/${file}.js`);
    const definition = (loaded as { definition?: IconDefinition }).definition ?? null;
    return definition && isIconDefinition(definition) ? definition : null;
  } catch {
    return null;
  }
}

export function faIconDefinition(name: string): Promise<IconDefinition | null> {
  const resolved = sportIconName(name);
  if (!resolved) return Promise.resolve(null);
  const cached = iconPromises.get(resolved);
  if (cached) return cached;
  const prefix: IconPrefix = resolved.startsWith("far:") ? "far" : resolved.startsWith("fab:") ? "fab" : "fas";
  const iconName = resolved.includes(":") ? resolved.slice(resolved.indexOf(":") + 1) : resolved;
  const promise = importOneIcon(prefix, iconFile(iconName));
  iconPromises.set(resolved, promise);
  return promise;
}

export async function resolveSportIcon(value: string): Promise<string | null> {
  const name = sportIconName(value);
  if (!name) return null;
  const icon = await faIconDefinition(name);
  return icon ? name : null;
}

function byIconName(left: CatalogEntry, right: CatalogEntry): number {
  return left.icon.iconName.localeCompare(right.icon.iconName) || left.icon.prefix.localeCompare(right.icon.prefix);
}

export async function searchFaIcons(query: string): Promise<FaIconHit[]> {
  const catalog = await loadFaCatalog();
  if (!sortedCatalog || sortedCatalog.length !== catalog.size) sortedCatalog = [...catalog.values()].sort(byIconName);
  const needle = query.trim().toLowerCase().replace(/\s+/g, "-");
  const entries = sortedCatalog;
  if (!needle) return entries;
  const starts: CatalogEntry[] = [];
  const contains: CatalogEntry[] = [];
  for (const entry of entries) {
    const words = entry.terms.split(" ");
    if (entry.icon.iconName.startsWith(needle) || words.some((word) => word.startsWith(needle))) starts.push(entry);
    else if (entry.terms.includes(needle)) contains.push(entry);
  }
  starts.sort(byIconName);
  contains.sort(byIconName);
  return [...starts, ...contains];
}


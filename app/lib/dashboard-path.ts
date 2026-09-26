import { EVENTS } from "@/app/lib/demo-data";

export type DashboardBase = "/dashboard" | "/demo";

export const ADMIN_SECTIONS = ["users", "teams", "subteams", "settings", "modules", "integrations", "languages", "translations"] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export type DashboardRoute =
  | { view: "home"; eventId: string | null; lineup: boolean }
  | { view: "team"; memberId: string | null }
  | { view: "subteams" }
  | { view: "venues" }
  | { view: "admin"; section: AdminSection };

function adminSection(value: string): AdminSection | null {
  return ADMIN_SECTIONS.find((section) => section === value) ?? null;
}

export function parseDashboardPath(path: string[] | undefined, options?: { demoEvents?: boolean }): DashboardRoute | null {
  const parts = path ?? [];
  if (parts.length === 0) return { view: "home", eventId: null, lineup: false };
  if (parts[0] === "team" && parts.length === 1) return { view: "team", memberId: null };
  if (parts[0] === "team" && parts.length === 2 && /^[A-Za-z0-9-]+$/.test(parts[1])) {
    return { view: "team", memberId: parts[1] };
  }
  if (parts[0] === "subteams" && parts.length === 1) return { view: "subteams" };
  if (parts[0] === "venues" && parts.length === 1) return { view: "venues" };
  if (parts[0] === "admin" && parts.length === 2) {
    const section = adminSection(parts[1]);
    if (section) return { view: "admin", section };
  }
  const demoEvents = options?.demoEvents ?? true;
  const eventId = parts[1];
  const eventPath = parts[0] === "events" && Boolean(eventId && /^[A-Za-z0-9-]+$/.test(eventId));
  const catalogEvent = EVENTS.some((event) => event.id === eventId);
  if (eventPath && (demoEvents || !catalogEvent) && parts.length === 2) {
    return { view: "home", eventId, lineup: false };
  }
  if (eventPath && (demoEvents || !catalogEvent) && parts.length === 3 && parts[2] === "lineup") {
    return { view: "home", eventId, lineup: true };
  }
  return null;
}

export function routeFromPathname(pathname: string, basePath: DashboardBase): DashboardRoute {
  if (pathname === basePath) return { view: "home", eventId: null, lineup: false };
  const prefix = `${basePath}/`;
  if (!pathname.startsWith(prefix)) return { view: "home", eventId: null, lineup: false };
  return parseDashboardPath(pathname.slice(prefix.length).split("/").filter(Boolean), { demoEvents: basePath === "/demo" }) ?? { view: "home", eventId: null, lineup: false };
}

export function teamHref(basePath: DashboardBase, memberId?: string | null): string {
  return memberId ? `${basePath}/team/${memberId}` : `${basePath}/team`;
}

export function eventHref(basePath: DashboardBase, eventId: string, lineup = false): string {
  return lineup ? `${basePath}/events/${eventId}/lineup` : `${basePath}/events/${eventId}`;
}
